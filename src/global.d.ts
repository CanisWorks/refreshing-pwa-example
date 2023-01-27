export {};

declare global {
  // adds config vars to window types (as they are in an additional JS script).
  interface Window { REACT_APP_REGISTER_SW: boolean; }
}
