/* ICLUB: acceso al portal mediante funciones de servidor con permisos propios. */
(function (root) {
  'use strict';
  var TOKEN_KEY = 'iclub-session-v1';
  function PortalApi(client) {
    this.client = client;
    this.version = null;
    this.currentUser = null;
    try { this.token = sessionStorage.getItem(TOKEN_KEY); } catch (_) { this.token = null; }
  }
  PortalApi.prototype.call = async function (name, args) {
    if (!this.client) throw new Error('No se pudo conectar al servidor.');
    var res = await this.client.rpc(name, args || {});
    if (res.error) throw new Error(res.error.message || 'No se pudo completar la operación.');
    if (!res.data || res.data.ok === false) throw new Error((res.data && res.data.error) || 'No se pudo completar la operación.');
    return res.data;
  };
  PortalApi.prototype.storeToken = function (token) {
    this.token = token || null;
    try { if (token) sessionStorage.setItem(TOKEN_KEY, token); else sessionStorage.removeItem(TOKEN_KEY); } catch (_) {}
  };
  PortalApi.prototype.login = async function (phone, password) {
    var res = await this.call('iclub_login', { p_phone: phone, p_password: password });
    this.storeToken(res.token);
    return this.read();
  };
  PortalApi.prototype.register = async function (phone, password) {
    var res = await this.call('iclub_register', { p_phone: phone, p_password: password });
    this.storeToken(res.token);
    return this.read();
  };
  PortalApi.prototype.read = async function (commit) {
    var res = await this.call('iclub_get_state', { p_token: this.token || '' });
    if (commit !== false) { this.version = res.version; this.currentUser = res.user; }
    return res;
  };
  PortalApi.prototype.revision = async function () {
    return this.call('iclub_get_revision', { p_token: this.token || '' });
  };
  PortalApi.prototype.write = async function (db) {
    var res = await this.call('iclub_save_state', {
      p_token: this.token || '', p_data: db, p_expected_version: this.version
    });
    this.version = res.version;
    return res;
  };
  PortalApi.prototype.request = async function (request) {
    return this.call('iclub_submit_request', { p_token: this.token || '', p_request: request });
  };
  PortalApi.prototype.logout = async function () {
    var token = this.token;
    this.storeToken(null);
    this.currentUser = null;
    this.version = null;
    if (token) await this.call('iclub_logout', { p_token: token });
  };
  root.ICLUBPortalApi = PortalApi;
  if (typeof module !== 'undefined' && module.exports) module.exports = PortalApi;
}(typeof window !== 'undefined' ? window : globalThis));
