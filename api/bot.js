// Telegram admin bot (Vercel function). Stores site content in data.json in the GitHub repo;
// every change is a commit, Vercel redeploys the site in ~1 min.
// Env: BOT_TOKEN, ADMIN_IDS (comma-separated Telegram user ids), GITHUB_TOKEN (contents: read/write).
// Open GET /api/bot once to register the webhook.
const crypto = require('crypto');

const REPO = 'ezixxxgame-cmyk/japan';
const { BOT_TOKEN, GITHUB_TOKEN, ADMIN_IDS = '' } = process.env;
const SECRET = crypto.createHash('sha256').update(String(BOT_TOKEN)).digest('hex');

const tg = (method, body) =>
  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json());

const gh = (path, init = {}) =>
  fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    ...init,
    headers: { authorization: `Bearer ${GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'user-agent': 'japancar-bot' },
  }).then(async r => {
    if (!r.ok) throw new Error(`GitHub ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return r.json();
  });

const put = (path, content, message, sha) =>
  gh(path, { method: 'PUT', body: JSON.stringify({ message, content: content.toString('base64'), sha, branch: 'main' }) });

async function load() {
  const f = await gh('data.json?ref=main');
  return { sha: f.sha, json: JSON.parse(Buffer.from(f.content, 'base64').toString('utf8')) };
}

const save = (data, message) => put('data.json', Buffer.from(JSON.stringify(data.json, null, 2) + '\n'), message, data.sha);

async function removeFile(path) {
  const f = await gh(`${path}?ref=main`);
  await gh(path, { method: 'DELETE', body: JSON.stringify({ message: `bot: удалено фото ${path}`, sha: f.sha, branch: 'main' }) });
}

async function download(fileId) {
  const f = await tg('getFile', { file_id: fileId });
  if (!f.ok) throw new Error(f.description);
  const r = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${f.result.file_path}`);
  return Buffer.from(await r.arrayBuffer());
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rub = n => n.toLocaleString('ru-RU') + ' ₽';
const lines = t => t.trim().split('\n').map(s => s.trim());

const KINDS = {
  cars: {
    one: 'авто',
    title: 'Авто в наличии',
    help: 'Фото с подписью или просто текст:\n1-я строка — марка, модель, год\n2-я строка — конечная цена, ₽\nдальше — описание',
    example: 'Toyota Harrier 2020\n3 250 000\nПробег 42 000 км, полный привод, оценка 4.5. Растаможен, ЭПТС готов.',
    parse(t) {
      const [title, price, ...rest] = lines(t);
      const item = { title, price: +String(price).replace(/\D/g, ''), text: rest.join('\n').trim() };
      return title && item.price >= 10000 && item.text ? item : null;
    },
    label: c => `${c.title} · ${rub(c.price)}`,
    source: c => `${c.title}\n${rub(c.price)}\n${c.text}`,
  },
  reviews: {
    one: 'отзыв',
    title: 'Отзывы',
    help: '1-я строка — имя\n2-я строка — авто и страна\n3-я строка — город доставки (или «-»)\nдальше — текст отзыва',
    example: 'Алексей М.\nToyota Harrier 2020 · Япония\nНовосибирск\nПрислали несколько лотов с аукционными листами, по выбранному сняли видео.',
    parse(t) {
      const [name, car, city, ...rest] = lines(t);
      const item = { name, car, city: city === '-' ? '' : city, text: rest.join('\n').trim() };
      return name && car && city && item.text ? item : null;
    },
    label: r => `${r.name} · ${r.car}`,
    source: r => `${r.name}\n${r.car}\n${r.city || '-'}\n${r.text}`,
  },
};
const KIND_BY_WORD = { авто: 'cars', отзыв: 'reviews' };
const PROMPT_RE = /^(Добавить|Изменить) (авто|отзыв)(?: #(\w+))?/;

const kb = buttons => buttons && { inline_keyboard: buttons.map(row => row.map(([text, data]) => ({ text, callback_data: data }))) };
const send = (chat, text, buttons) => tg('sendMessage', { chat_id: chat, text, parse_mode: 'HTML', reply_markup: kb(buttons) });

async function menu(chat, text = 'Что редактируем на сайте?', json) {
  json = json || (await load()).json;
  return send(chat, text, Object.entries(KINDS).map(([k, K]) => [[`${K.title} (${json[k].length})`, `list:${k}`]]));
}

function prompt(chat, kind, old, note = '') {
  const K = KINDS[kind];
  const head = old ? `Изменить ${K.one} #${old.id}` : `Добавить ${K.one}`;
  const sample = old ? 'Текущий текст (нажмите, чтобы скопировать):' : 'Пример:';
  return tg('sendMessage', {
    chat_id: chat,
    parse_mode: 'HTML',
    text: `${head}\n${note}Ответьте на это сообщение.\n${esc(K.help)}\n\n${sample}\n<pre>${esc(old ? K.source(old) : K.example)}</pre>`,
    reply_markup: { force_reply: true, input_field_placeholder: K.help.split('\n')[1] },
  });
}

async function onCallback(q) {
  const chat = q.message.chat.id;
  await tg('answerCallbackQuery', { callback_query_id: q.id });
  await tg('deleteMessage', { chat_id: chat, message_id: q.message.message_id });
  const [act, kind, id] = q.data.split(':');
  if (act === 'menu') return menu(chat);
  const K = KINDS[kind];
  if (act === 'add') return prompt(chat, kind);

  const data = await load();
  const list = data.json[kind];
  if (act === 'list') {
    return send(chat, `${K.title}: ${list.length ? list.length : 'пока пусто'}`, [
      ...list.map(x => [[K.label(x).slice(0, 60), `view:${kind}:${x.id}`]]),
      [[`Добавить ${K.one}`, `add:${kind}`]],
      [['Назад', 'menu']],
    ]);
  }

  const item = list.find(x => x.id === id);
  if (!item) return menu(chat, 'Запись не найдена — возможно, её уже удалили.');
  const back = ['Назад', `list:${kind}`];

  if (act === 'view') {
    const buttons = [[['Изменить', `edit:${kind}:${id}`], ['Удалить', `del:${kind}:${id}`]], [back]];
    if (!item.photoId) return send(chat, esc(K.source(item)), buttons);
    return tg('sendPhoto', {
      chat_id: chat, photo: item.photoId, caption: esc(K.source(item).slice(0, 1024)), parse_mode: 'HTML', reply_markup: kb(buttons),
    });
  }
  if (act === 'edit') return prompt(chat, kind, item);
  if (act === 'del') {
    return send(chat, `Удалить ${K.one} «${esc(K.label(item))}»?`, [[['Да, удалить', `rm:${kind}:${id}`], ['Отмена', `view:${kind}:${id}`]]]);
  }
  if (act === 'rm') {
    list.splice(list.indexOf(item), 1);
    await save(data, `bot: удалено ${K.one} ${K.label(item)}`);
    if (item.photo) await removeFile(item.photo);
    return menu(chat, 'Удалено. Сайт обновится через 1–2 минуты.', data.json);
  }
}

async function onMessage(m) {
  const chat = m.chat.id;
  const p = (m.reply_to_message?.text || '').match(PROMPT_RE);
  if (!p || (m.text || '').startsWith('/')) return menu(chat);
  const kind = KIND_BY_WORD[p[2]], K = KINDS[kind];
  if (m.document) return prompt(chat, kind, null, 'Фото нужно отправить как фото, не файлом.\n');

  const data = await load();
  const list = data.json[kind];
  const old = p[3] && list.find(x => x.id === p[3]);
  if (p[3] && !old) return menu(chat, 'Запись не найдена — возможно, её уже удалили.');

  const text = m.caption || m.text;
  // Photo without caption while editing a car = replace only the photo.
  const fields = text ? K.parse(text) : old && m.photo && kind === 'cars' ? {} : null;
  if (!fields) return prompt(chat, kind, old, 'Не получилось разобрать текст, проверьте строки.\n');

  const next = { ...old, ...fields, id: old ? old.id : Date.now().toString(36) };
  let oldPhoto;
  if (kind === 'cars' && m.photo) {
    const ph = m.photo[m.photo.length - 1];
    next.photo = `assets/cars/${next.id}-${Date.now().toString(36)}.jpg`;
    next.photoId = ph.file_id;
    await put(next.photo, await download(ph.file_id), `bot: фото ${next.title}`);
    oldPhoto = old && old.photo;
  }
  if (old) list[list.indexOf(old)] = next;
  else list.unshift(next);
  await save(data, `bot: ${old ? 'изменено' : 'добавлено'} ${K.one} ${K.label(next)}`);
  if (oldPhoto) await removeFile(oldPhoto);
  return menu(chat, 'Сохранено. Сайт обновится через 1–2 минуты.', data.json);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    const r = await tg('setWebhook', {
      url: `https://${req.headers.host}/api/bot`, secret_token: SECRET, allowed_updates: ['message', 'callback_query'],
    });
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    return res.status(200).send(r.ok ? 'Вебхук установлен, бот работает.' : `Ошибка Telegram: ${r.description}`);
  }
  if (req.headers['x-telegram-bot-api-secret-token'] !== SECRET) return res.status(401).end();

  const u = req.body || {};
  const from = (u.message || u.callback_query || {}).from;
  const chat = u.message ? u.message.chat.id : u.callback_query && u.callback_query.message.chat.id;
  if (from && chat) {
    try {
      if (!ADMIN_IDS.split(',').map(s => s.trim()).includes(String(from.id))) {
        await send(chat, `Нет доступа. Ваш Telegram ID: <code>${from.id}</code> — добавьте его в ADMIN_IDS на Vercel.`);
      } else if (u.callback_query) await onCallback(u.callback_query);
      else await onMessage(u.message);
    } catch (e) {
      console.error(e);
      await send(chat, `Ошибка: ${esc(e.message)}\nПопробуйте ещё раз.`).catch(() => {});
    }
  }
  res.status(200).end();
};
