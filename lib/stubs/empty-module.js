// Stand-in for UNUSED wallet-SDK packages (Base Account, Coinbase CDP...) that wagmi's connector list imports
// statically. Loading it always succeeds; calling anything from it throws a clear error, so nothing breaks at
// startup and nothing runs unless a user actually picks one of those connectors.
function unsupported() {
  throw new Error('This wallet connector is not included in this build of AnonBook.');
}
const base = { __esModule: true, default: unsupported };
module.exports = new Proxy(base, {
  get(target, prop) {
    if (prop in target) return target[prop];
    if (typeof prop === 'symbol' || prop === 'then' || prop === 'toJSON') return undefined; // keep dynamic import() and inspection safe
    return unsupported;
  },
});
