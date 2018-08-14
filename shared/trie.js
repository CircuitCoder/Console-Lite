function normalizeCode(code) {
  if(code >= 65 && code <= 90) return code - 65 + 97;
  if(code > 127) return null;
  return code;
}

class Node {
  constructor() {
    this.entries = new Set();
    this.children = new Map();
  }

  put(string) {
    if(string.length === 0) return this;

    const i = normalizeCode(string.charCodeAt(0));
    if(i === null) return null;

    if(!this.children.has(i)) this.children.set(i, new Node());
    return this.children.get(i).put(string.substring(1));
  }

  get(string) {
    if(string.length === 0) return this;

    const i = normalizeCode(string.charCodeAt(0));
    if(i === null) return null;
    else if(!this.children.has(i)) return null;
    else return this.children.get(i).get(string.substring(1));
  }

  addEntry(entry) {
    this.entries.add(entry);
  }

  getEntries() {
    return this.entries.values();
  }

  forEach(fn) {
    fn(this);
    for(const l of this.children.values()) l.forEach(fn);
  }

  forEachLeaf(fn) {
    if(this.children.size === 0) return void fn(this);

    for(const l of this.children.values())
      l.forEachLeaf(fn);
  }

  // Deep copy a node, return leaves
  deepCopy() {
    const result = new Node();
    result.entries = new Set(this.entries.values());

    let leaves = [];

    for(const k of this.children.keys()) {
      const [node, subleaves] = this.children.get(k).deepCopy();
      result.children.set(k, node);
      leaves = leaves.concat(subleaves);
    }

    if(leaves.length === 0) leaves = [result];

    return [result, leaves];
  }

  // Apply entries to another tree, return leaves
  applyTo(ano) {
    const outer = this;
    const ns = new Set(function* nsgen() {
      yield* ano.entries;
      yield* outer.entries;
    }());

    ano.entries = ns;

    let leaves = [];

    for(const k of this.children.keys())
      if(!ano.children.has(k)) {
        const [node, subleaves] = this.children.get(k).deepCopy();
        ano.children.set(k, node);
        leaves = leaves.concat(subleaves);
      } else leaves = leaves.concat(this.children.get(k).applyTo(ano.children.get(k)));

    if(leaves.length === 0) leaves = [ano];
    return leaves;
  }

  static fromStrings(strs) {
    const root = new Node();
    for(const s of strs) root.put(s);
    return root;
  }
}

module.exports = Node;
