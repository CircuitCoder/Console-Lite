class Node {
  constructor() {
    this.entries = new Set();
    this.children = new Array(26); // Only lower cases
  }

  put(string) {
    if(string.length === 0) return this;

    const i = string.charCodeAt(0) - 97;
    if(i < 0 || i > 25) return null;

    if(!this.children[i]) this.children[i] = new Node();
    return this.children[i].put(string.substring(1));
  }

  get(string) {
    if(string.length === 0) return this;

    const i = string.charCodeAt(0) - 97;
    if(i < 0 || i > 25) return null;
    else if(!this.children[i]) return null;
    else return this.children[i].get(string.substring(1));
  }

  addEntry(entry) {
    this.entries.add(entry);
  }

  getEntries() {
    return this.entries.values();
  }

  forEach(fn) {
    fn(this);
    for(const l of this.children) if(l) l.forEach(fn);
  }

  forEachLeaf(fn) {
    let isLeaf = true;
    for(const l of this.childrens) if(l) {
      l.forEachLeaf(fn);
      isLeaf = false;
    }

    if(isLeaf) fn(this);
  }

  // Deep copy a node, return leaves
  deepCopy() {
    const result = new Node();
    result.entries = new Set(this.entries.values());

    let leaves = [];

    for(let i = 0; i < 26; ++i)
      if(this.children[i]) {
        const [node, subleaves] = this.children[i].deepCopy();
        result.children[i] = node;
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

    for(let i = 0; i < 26; ++i)
      if(this.children[i])
        if(!ano.children[i]) {
          const [node, subleaves] = this.children[i].deepCopy();
          ano.children[i] = node;
          leaves = leaves.concat(subleaves);
        } else leaves = leaves.concat(this.children[i].applyTo(ano.children[i]));

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
