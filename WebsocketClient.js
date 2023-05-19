// const myUrl = location.host.includes('local.webcontainer')
//   ? window.location.host
//   : 'websocket.hidora.com';

const myUrl = "ws.3e8.ch"

function getRemover(target, listenerFunction) {
  return {
    remove: () => target.removeEventListener('message', listenerFunction),
  };
}

class WS {
  static async connect(roomname, username) {
    try {
      const wsRaw = await this._connect(roomname);
      const ws = new WS(wsRaw, roomname);
      ws.username = await ws._enter(username);
      return ws;
    } catch (e) {
      console.warn(e);
      throw new Error('Websocket not possible');
    }
  }
  constructor(wsRaw, roomname) {
    this.wsRaw = wsRaw;
    this.roomname = roomname;
  }
  onUserStatus(fn) {
    const listenerProxy = (event) => {
      const { action, data } = JSON.parse(event.data);
      if (action.startsWith('userlist')) fn(data);
    };
    this.wsRaw.addEventListener('message', listenerProxy);
    return getRemover(this.wsRaw, listenerProxy);
  }
  onMessage(fn) {
    const listenerProxy = (event) => {
      const { action, data, ...other } = JSON.parse(event.data);
      if (action.startsWith('send')) fn({ action, data, ...other });
    };
    this.wsRaw.addEventListener('message', listenerProxy);
    return getRemover(this.wsRaw, listenerProxy);
  }
  getUsers() {
    this._send('getUsers', '');
  }
  sendToAll(data) {
    this._send('sendToAll', data);
  }
  sendToOpener(data) {
    this._send('sendToOpener', data);
  }
  sendToUser(data, user) {
    this._send('sendToUser', data, user);
  }
  async _enter(username) {
    return await new Promise((resolve, reject) => {
      const checkConfirmation = (event) => {
        const { action, data } = JSON.parse(event.data);
        if (action === 'confirm') {
          this.wsRaw.removeEventListener('message', checkConfirmation);
          resolve(data.username);
        }
      };
      this.wsRaw.addEventListener('message', checkConfirmation);
      this._send('enter', { username });
    });
  }
  _send(action, data, targetUser) {
    this.wsRaw.send(JSON.stringify({ action, data, targetUser }));
  }
  static async _connect(roomname) {
    return new Promise((resolve, reject) => {
      const s = new WebSocket(`wss://${myUrl}/${roomname}`);
      s.addEventListener('error', this._onError);
      s.addEventListener('open', (m) => {
        resolve(s);
      });
    });
  }
  static _onError(e) {
    console.warn(e);
  }
}
