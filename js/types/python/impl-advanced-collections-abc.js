/* 高度モード B7 G4：collections.abc モジュール（27件）。
 * ABC 群は isinstance 登録用のクラスとして収載する。エンジンの isinstance は
 * ネイティブクラスの継承チェーンに対してのみ働くため、組み込み値（dict/list 等）に
 * 対する isinstance は再現できない（基盤要請）。単独実体化は CPython どおり
 * 抽象クラスとして TypeError。ビュー（*View）は mapping を受けて実体化できる。 */
import { registerStdlibModule, registerStdlibClass } from './stdlib-registry.js';
import { BOOL, I, NONE, TUPLE, isDict, dictPairs } from './impl-advanced-g4-common.js';
import { pairsOfValue } from './impl-advanced-collections.js';

function abstractDef(typeName, parents) {
  return {
    typeName,
    parents: parents || [],
    construct: (ctx) => ctx.err('TypeError',
      "Can't instantiate abstract class " + typeName + ' without an implementation for abstract methods',
      'collections.abc のクラスは継承して使うためのもので、単独では実体化できません'),
  };
}

/* ビュー：mapping を包み、len/iter/contains/repr を辞書ビューらしく振る舞う */
function viewDef(typeName, kind) {
  return {
    typeName,
    parents: kind === 'values'
      ? ['collections.abc.MappingView', 'collections.abc.Collection']
      : ['collections.abc.MappingView', 'collections.abc.Set'],
    construct: (ctx, args) => {
      if (!args.length) ctx.err('TypeError', typeName + ' expected 1 argument, got 0', '');
      const pairs = pairsOfValue(args[0]);
      if (pairs === null) ctx.err('TypeError', typeName + ' の引数にはマッピングを使ってください', '');
      return ctx.native('collections.abc.' + typeName, { mapping: args[0], kind });
    },
    len: (ctx, self) => (pairsOfValue(self.data.mapping) || []).length,
    iter: (ctx, self) => {
      const pairs = pairsOfValue(self.data.mapping) || [];
      if (self.data.kind === 'keys') return pairs.map(([k]) => k);
      if (self.data.kind === 'values') return pairs.map(([, v]) => v);
      return pairs.map(([k, v]) => TUPLE([k, v]));
    },
    contains: (ctx, self, item) => {
      const pairs = pairsOfValue(self.data.mapping) || [];
      if (self.data.kind === 'keys') return pairs.some(([k]) => ctx.eq(k, item) === true);
      if (self.data.kind === 'values') return pairs.some(([, v]) => ctx.eq(v, item) === true);
      return false;
    },
    repr: (ctx, self) => {
      const name = self.data.kind === 'keys' ? 'dict_keys' : self.data.kind === 'values' ? 'dict_values' : 'dict_items';
      const pairs = pairsOfValue(self.data.mapping) || [];
      const body = self.data.kind === 'keys' ? pairs.map(([k]) => ctx.repr(k)).join(', ')
        : self.data.kind === 'values' ? pairs.map(([, v]) => ctx.repr(v)).join(', ')
        : pairs.map(([k, v]) => '(' + ctx.repr(k) + ', ' + ctx.repr(v) + ')').join(', ');
      return name + '([' + body + '])';
    },
    truthy: (ctx, self) => (pairsOfValue(self.data.mapping) || []).length > 0,
  };
}

registerStdlibModule('collections.abc', {
  classes: {
    AsyncGenerator: abstractDef('AsyncGenerator', ['collections.abc.AsyncIterator']),
    AsyncIterable: abstractDef('AsyncIterable'),
    AsyncIterator: abstractDef('AsyncIterator', ['collections.abc.AsyncIterable']),
    Awaitable: abstractDef('Awaitable'),
    ByteString: abstractDef('ByteString', ['collections.abc.Sequence']),
    Callable: abstractDef('Callable'),
    Collection: abstractDef('Collection', ['collections.abc.Sized', 'collections.abc.Iterable', 'collections.abc.Container']),
    Container: abstractDef('Container'),
    Coroutine: abstractDef('Coroutine', ['collections.abc.Awaitable']),
    Generator: abstractDef('Generator', ['collections.abc.Iterator']),
    Hashable: abstractDef('Hashable'),
    ItemsView: viewDef('ItemsView', 'items'),
    Iterable: abstractDef('Iterable'),
    Iterator: abstractDef('Iterator', ['collections.abc.Iterable']),
    KeysView: viewDef('KeysView', 'keys'),
    Mapping: abstractDef('Mapping', ['collections.abc.Collection']),
    MappingView: abstractDef('MappingView', ['collections.abc.Sized']),
    MutableMapping: abstractDef('MutableMapping', ['collections.abc.Mapping']),
    MutableSequence: abstractDef('MutableSequence', ['collections.abc.Sequence']),
    MutableSet: abstractDef('MutableSet', ['collections.abc.Set']),
    Reversible: abstractDef('Reversible', ['collections.abc.Iterable']),
    Sequence: abstractDef('Sequence', ['collections.abc.Reversible', 'collections.abc.Collection']),
    Set: abstractDef('Set', ['collections.abc.Collection']),
    Sized: abstractDef('Sized'),
    ValuesView: viewDef('ValuesView', 'values'),
    Buffer: abstractDef('Buffer'),
  },
});
