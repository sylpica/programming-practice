/* 高度モード B7 G5：リファレンス例題の期待出力（F-04 照合用）。
 * CPython 3.12.3 実走で生成（生成器は報告書参照）。matmul 系は設計判断により
 * 表に含めず、振る舞いテストで個別確認する。Placeholder／is_none／is_not_none は
 * 3.12.3 に存在しないため公式ドキュメントに基づく（エンジン実走で一致確認済み）。 */
export const G5_EXPECTED = {
 "itertools.accumulate": [
  "[1, 3, 6, 10]"
 ],
 "itertools.batched": [
  "[('A', 'B', 'C'), ('D', 'E', 'F'), ('G',)]"
 ],
 "itertools.chain": [
  "['A', 'B', 'C', 'D']"
 ],
 "itertools.chain.from_iterable": [
  "['A', 'B', 'C', 'D']"
 ],
 "itertools.combinations": [
  "[('A', 'B'), ('A', 'C'), ('B', 'C')]"
 ],
 "itertools.combinations_with_replacement": [
  "[('A', 'A'), ('A', 'B'), ('B', 'B')]"
 ],
 "itertools.compress": [
  "['A', 'C', 'E', 'F']"
 ],
 "itertools.count": [
  "[10, 13, 16, 19]"
 ],
 "itertools.cycle": [
  "['A', 'B', 'A', 'B', 'A']"
 ],
 "itertools.dropwhile": [
  "[3, 1]"
 ],
 "itertools.filterfalse": [
  "[0, 2, 4]"
 ],
 "itertools.groupby": [
  "[('A', ['A', 'A', 'A']), ('B', ['B', 'B'])]"
 ],
 "itertools.islice": [
  "[2, 4, 6]"
 ],
 "itertools.pairwise": [
  "[('A', 'B'), ('B', 'C'), ('C', 'D')]"
 ],
 "itertools.permutations": [
  "[('A', 'B'), ('B', 'A')]"
 ],
 "itertools.product": [
  "[('A', '1'), ('A', '2'), ('B', '1'), ('B', '2')]"
 ],
 "itertools.repeat": [
  "[7, 7, 7]"
 ],
 "itertools.starmap": [
  "[8, 9]"
 ],
 "itertools.takewhile": [
  "[1, 2]"
 ],
 "itertools.tee": [
  "[1, 2, 3] [1, 2, 3]"
 ],
 "itertools.zip_longest": [
  "[('A', '1'), ('B', '2'), ('-', '3')]"
 ],
 "functools.Placeholder": [
  "Placeholder"
 ],
 "functools.cache": [
  "6 6"
 ],
 "functools.cmp_to_key": [
  "[3, 2, 1]"
 ],
 "functools.lru_cache": [
  "2 2 CacheInfo(hits=1, misses=1, maxsize=None, currsize=1)"
 ],
 "functools.lru_cache.cache_clear": [
  "CacheInfo(hits=0, misses=0, maxsize=None, currsize=0)"
 ],
 "functools.lru_cache.cache_info": [
  "CacheInfo(hits=1, misses=1, maxsize=None, currsize=1)"
 ],
 "functools.partial": [
  "32"
 ],
 "functools.partial.args": [
  "(2,)"
 ],
 "functools.partial.func": [
  "True"
 ],
 "functools.partial.keywords": [
  "{'a': 1}"
 ],
 "functools.reduce": [
  "10"
 ],
 "functools.singledispatch": [
  "default"
 ],
 "functools.singledispatch.register": [
  "int default"
 ],
 "operator.__abs__": [
  "5"
 ],
 "operator.__add__": [
  "5"
 ],
 "operator.__and__": [
  "2"
 ],
 "operator.__call__": [
  "8"
 ],
 "operator.__concat__": [
  "[1, 2, 3]"
 ],
 "operator.__contains__": [
  "True"
 ],
 "operator.__delitem__": [
  "[2]"
 ],
 "operator.__eq__": [
  "True"
 ],
 "operator.__floordiv__": [
  "3"
 ],
 "operator.__ge__": [
  "False"
 ],
 "operator.__getitem__": [
  "20"
 ],
 "operator.__gt__": [
  "True"
 ],
 "operator.__iadd__": [
  "[1, 2]"
 ],
 "operator.__iand__": [
  "2"
 ],
 "operator.__iconcat__": [
  "[1, 2]"
 ],
 "operator.__ifloordiv__": [
  "3"
 ],
 "operator.__ilshift__": [
  "8"
 ],
 "operator.__imod__": [
  "1"
 ],
 "operator.__imul__": [
  "[1, 2, 1, 2]"
 ],
 "operator.__index__": [
  "7"
 ],
 "operator.__inv__": [
  "-6"
 ],
 "operator.__invert__": [
  "-6"
 ],
 "operator.__ior__": [
  "5"
 ],
 "operator.__ipow__": [
  "8"
 ],
 "operator.__irshift__": [
  "2"
 ],
 "operator.__isub__": [
  "3"
 ],
 "operator.__itruediv__": [
  "3.5"
 ],
 "operator.__ixor__": [
  "5"
 ],
 "operator.__le__": [
  "True"
 ],
 "operator.__lshift__": [
  "12"
 ],
 "operator.__lt__": [
  "True"
 ],
 "operator.__mod__": [
  "1"
 ],
 "operator.__mul__": [
  "12"
 ],
 "operator.__ne__": [
  "True"
 ],
 "operator.__neg__": [
  "-5"
 ],
 "operator.__not__": [
  "True"
 ],
 "operator.__or__": [
  "5"
 ],
 "operator.__pos__": [
  "-5"
 ],
 "operator.__pow__": [
  "1024"
 ],
 "operator.__rshift__": [
  "3"
 ],
 "operator.__setitem__": [
  "[9, 2]"
 ],
 "operator.__sub__": [
  "3"
 ],
 "operator.__truediv__": [
  "3.5"
 ],
 "operator.__xor__": [
  "5"
 ],
 "operator.abs": [
  "5"
 ],
 "operator.add": [
  "5"
 ],
 "operator.and_": [
  "2"
 ],
 "operator.attrgetter": [
  "1"
 ],
 "operator.call": [
  "8"
 ],
 "operator.concat": [
  "[1, 2, 3]"
 ],
 "operator.contains": [
  "True"
 ],
 "operator.countOf": [
  "2"
 ],
 "operator.delitem": [
  "[2]"
 ],
 "operator.eq": [
  "True"
 ],
 "operator.floordiv": [
  "3"
 ],
 "operator.ge": [
  "False"
 ],
 "operator.getitem": [
  "20"
 ],
 "operator.gt": [
  "True"
 ],
 "operator.iadd": [
  "[1, 2]"
 ],
 "operator.iand": [
  "2"
 ],
 "operator.iconcat": [
  "[1, 2]"
 ],
 "operator.ifloordiv": [
  "3"
 ],
 "operator.ilshift": [
  "8"
 ],
 "operator.imod": [
  "1"
 ],
 "operator.imul": [
  "[1, 2, 1, 2]"
 ],
 "operator.index": [
  "7"
 ],
 "operator.indexOf": [
  "1"
 ],
 "operator.inv": [
  "-6"
 ],
 "operator.invert": [
  "-6"
 ],
 "operator.ior": [
  "5"
 ],
 "operator.ipow": [
  "8"
 ],
 "operator.irshift": [
  "2"
 ],
 "operator.is_": [
  "True"
 ],
 "operator.is_none": [
  "True"
 ],
 "operator.is_not": [
  "True"
 ],
 "operator.is_not_none": [
  "True"
 ],
 "operator.isub": [
  "3"
 ],
 "operator.itemgetter": [
  "b"
 ],
 "operator.itruediv": [
  "3.5"
 ],
 "operator.ixor": [
  "5"
 ],
 "operator.le": [
  "True"
 ],
 "operator.length_hint": [
  "3"
 ],
 "operator.lshift": [
  "12"
 ],
 "operator.lt": [
  "True"
 ],
 "operator.methodcaller": [
  "ABC"
 ],
 "operator.mod": [
  "1"
 ],
 "operator.mul": [
  "12"
 ],
 "operator.ne": [
  "True"
 ],
 "operator.neg": [
  "-5"
 ],
 "operator.not_": [
  "True"
 ],
 "operator.or_": [
  "5"
 ],
 "operator.pos": [
  "-5"
 ],
 "operator.pow": [
  "1024"
 ],
 "operator.rshift": [
  "3"
 ],
 "operator.setitem": [
  "[9, 2]"
 ],
 "operator.sub": [
  "3"
 ],
 "operator.truediv": [
  "3.5"
 ],
 "operator.truth": [
  "True"
 ],
 "operator.xor": [
  "5"
 ]
};
