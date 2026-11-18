/* 高度モード B7（G13）：ipaddress のリファレンス（全115件）。
 * 形式は高度モード契約（advanced-interface.md 第4章）の正規形。
 * 生成器：/tmp/gen_ref_g13.py（G13 作業用） */
export const referenceAdvanced = [
 {
  "name": "ipaddress.AddressValueError",
  "category": "標準ライブラリ",
  "syntax": "ipaddress.AddressValueError",
  "description": "アドレスの形式が不正なときに送出される例外（ValueError のサブクラス）。",
  "example": "import ipaddress\ntry:\n    ipaddress.IPv4Address('999.1.1.1')\nexcept ipaddress.AddressValueError:\n    print('AddressValueError')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.AddressValueError"
 },
 {
  "name": "ipaddress.NetmaskValueError",
  "category": "標準ライブラリ",
  "syntax": "ipaddress.NetmaskValueError",
  "description": "ネットマスク／プレフィックス長が不正なときに送出される例外（ValueError のサブクラス）。",
  "example": "import ipaddress\ntry:\n    ipaddress.IPv4Network('192.0.2.0/33')\nexcept ipaddress.NetmaskValueError:\n    print('NetmaskValueError')",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.NetmaskValueError"
 },
 {
  "name": "ipaddress.IPv4Address",
  "category": "標準ライブラリ",
  "syntax": "IPv4Address('192.0.2.1')",
  "description": "IPv4 アドレスを表すクラス。文字列・整数・バイト列から生成できる。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Address('192.0.2.1'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Address"
 },
 {
  "name": "ipaddress.IPv4Address.__format__",
  "category": "標準ライブラリ",
  "syntax": "format(addr, 'b')",
  "description": "書式指定でアドレスを文字列化する。s（通常表記）、b（2進）、x/X（16進）、n（v4では b と同じ）が使え、# と _ も指定できる。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Address('192.0.2.1').__format__('b'))",
  "caution": "組み込みの format() や f 文字列からは本アプリでは呼び出せないため、メソッドとして直接呼び出す形で使う。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Address.__format__"
 },
 {
  "name": "ipaddress.IPv4Address.compressed",
  "category": "標準ライブラリ",
  "syntax": "addr.compressed",
  "description": "圧縮表記（通常の文字列表記）のアドレス文字列。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Address('192.0.2.1').compressed)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Address.compressed"
 },
 {
  "name": "ipaddress.IPv4Address.exploded",
  "category": "標準ライブラリ",
  "syntax": "addr.exploded",
  "description": "展開表記（省略のない完全な表記）のアドレス文字列。IPv4 では compressed と同じ。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Address('192.0.2.1').exploded)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Address.exploded"
 },
 {
  "name": "ipaddress.IPv4Address.ipv6_mapped",
  "category": "標準ライブラリ",
  "syntax": "addr.ipv6_mapped",
  "description": "この IPv4 アドレスに対応する IPv4 射影 IPv6 アドレス（::ffff:a.b.c.d）。3.13 で追加。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Address('192.0.2.1').ipv6_mapped)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Address.ipv6_mapped"
 },
 {
  "name": "ipaddress.IPv4Address.is_global",
  "category": "標準ライブラリ",
  "syntax": "addr.is_global",
  "description": "グローバルに到達可能なアドレスなら True。100.64.0.0/10（共有アドレス空間）では is_private と両方 False になる。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Address('8.8.8.8').is_global)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Address.is_global"
 },
 {
  "name": "ipaddress.IPv4Address.is_link_local",
  "category": "標準ライブラリ",
  "syntax": "addr.is_link_local",
  "description": "リンクローカル（169.254.0.0/16）なら True。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Address('169.254.0.1').is_link_local)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Address.is_link_local"
 },
 {
  "name": "ipaddress.IPv4Address.is_loopback",
  "category": "標準ライブラリ",
  "syntax": "addr.is_loopback",
  "description": "ループバック（127.0.0.0/8）なら True。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Address('127.0.0.1').is_loopback)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Address.is_loopback"
 },
 {
  "name": "ipaddress.IPv4Address.is_multicast",
  "category": "標準ライブラリ",
  "syntax": "addr.is_multicast",
  "description": "マルチキャスト（224.0.0.0/4）なら True。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Address('224.0.0.1').is_multicast)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Address.is_multicast"
 },
 {
  "name": "ipaddress.IPv4Address.is_private",
  "category": "標準ライブラリ",
  "syntax": "addr.is_private",
  "description": "IANA 特殊用途レジストリでグローバル到達不可とされる範囲なら True（192.0.0.9/32 等の例外を除く）。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Address('192.168.0.1').is_private)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Address.is_private"
 },
 {
  "name": "ipaddress.IPv4Address.is_reserved",
  "category": "標準ライブラリ",
  "syntax": "addr.is_reserved",
  "description": "IETF 予約済み（240.0.0.0/4）なら True。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Address('240.0.0.1').is_reserved)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Address.is_reserved"
 },
 {
  "name": "ipaddress.IPv4Address.is_unspecified",
  "category": "標準ライブラリ",
  "syntax": "addr.is_unspecified",
  "description": "未指定アドレス（0.0.0.0）なら True。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Address('0.0.0.0').is_unspecified)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Address.is_unspecified"
 },
 {
  "name": "ipaddress.IPv4Address.max_prefixlen",
  "category": "標準ライブラリ",
  "syntax": "addr.max_prefixlen",
  "description": "プレフィックス長の最大値（IPv4 では 32）。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Address('192.0.2.1').max_prefixlen)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Address.max_prefixlen"
 },
 {
  "name": "ipaddress.IPv4Address.packed",
  "category": "標準ライブラリ",
  "syntax": "addr.packed",
  "description": "アドレスのバイナリ表現（4 バイトの bytes）。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Address('192.0.2.1').packed)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Address.packed"
 },
 {
  "name": "ipaddress.IPv4Address.reverse_pointer",
  "category": "標準ライブラリ",
  "syntax": "addr.reverse_pointer",
  "description": "逆引き DNS 名（in-addr.arpa）。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Address('192.0.2.1').reverse_pointer)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Address.reverse_pointer"
 },
 {
  "name": "ipaddress.IPv4Address.version",
  "category": "標準ライブラリ",
  "syntax": "addr.version",
  "description": "IP バージョン（4）。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Address('192.0.2.1').version)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Address.version"
 },
 {
  "name": "ipaddress.IPv4Interface",
  "category": "標準ライブラリ",
  "syntax": "IPv4Interface('192.0.2.1/24')",
  "description": "アドレスとネットワークの組を表すクラス（ホスト側の視点）。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Interface('192.0.2.1/24'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Interface"
 },
 {
  "name": "ipaddress.IPv4Interface.ip",
  "category": "標準ライブラリ",
  "syntax": "iface.ip",
  "description": "インタフェースのアドレス部分（IPv4Address）。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Interface('192.0.2.1/24').ip)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Interface.ip"
 },
 {
  "name": "ipaddress.IPv4Interface.network",
  "category": "標準ライブラリ",
  "syntax": "iface.network",
  "description": "インタフェースが属するネットワーク（IPv4Network）。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Interface('192.0.2.1/24').network)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Interface.network"
 },
 {
  "name": "ipaddress.IPv4Interface.with_hostmask",
  "category": "標準ライブラリ",
  "syntax": "iface.with_hostmask",
  "description": "アドレス/ホストマスク の文字列。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Interface('192.0.2.1/24').with_hostmask)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Interface.with_hostmask"
 },
 {
  "name": "ipaddress.IPv4Interface.with_netmask",
  "category": "標準ライブラリ",
  "syntax": "iface.with_netmask",
  "description": "アドレス/ネットマスク の文字列。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Interface('192.0.2.1/24').with_netmask)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Interface.with_netmask"
 },
 {
  "name": "ipaddress.IPv4Interface.with_prefixlen",
  "category": "標準ライブラリ",
  "syntax": "iface.with_prefixlen",
  "description": "アドレス/プレフィックス長 の文字列。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Interface('192.0.2.1/24').with_prefixlen)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Interface.with_prefixlen"
 },
 {
  "name": "ipaddress.IPv4Network",
  "category": "標準ライブラリ",
  "syntax": "IPv4Network('192.0.2.0/24')",
  "description": "IPv4 ネットワークを表すクラス。既定ではホストビットが立っていると ValueError（strict=False でマスクされる）。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Network('192.0.2.0/24'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network"
 },
 {
  "name": "ipaddress.IPv4Network.address_exclude",
  "category": "標準ライブラリ",
  "syntax": "net.address_exclude(other)",
  "description": "other を除いた残りのネットワーク群を生成するイテレータ。生成順は分割の発見順（ソート順ではない）。",
  "example": "import ipaddress\nprint(list(ipaddress.IPv4Network('192.0.2.0/28').address_exclude(ipaddress.IPv4Network('192.0.2.1/32'))))",
  "caution": "要素数が100000件を超える場合は、本アプリでは結果を確定しません。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network.address_exclude"
 },
 {
  "name": "ipaddress.IPv4Network.broadcast_address",
  "category": "標準ライブラリ",
  "syntax": "net.broadcast_address",
  "description": "ブロードキャストアドレス。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Network('192.0.2.0/24').broadcast_address)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network.broadcast_address"
 },
 {
  "name": "ipaddress.IPv4Network.compare_networks",
  "category": "標準ライブラリ",
  "syntax": "net.compare_networks(other)",
  "description": "ネットワークアドレス→ネットマスクの順で比較し -1/0/1 を返す。バージョンが違うと比較できない（TypeError）。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Network('192.0.2.0/25').compare_networks(ipaddress.IPv4Network('192.0.2.0/24')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network.compare_networks"
 },
 {
  "name": "ipaddress.IPv4Network.compressed",
  "category": "標準ライブラリ",
  "syntax": "net.compressed",
  "description": "ネットワークの圧縮表記（アドレス/プレフィックス長）。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Network('192.0.2.0/24').compressed)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network.compressed"
 },
 {
  "name": "ipaddress.IPv4Network.exploded",
  "category": "標準ライブラリ",
  "syntax": "net.exploded",
  "description": "ネットワークの展開表記。IPv4 では compressed と同じ。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Network('192.0.2.0/24').exploded)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network.exploded"
 },
 {
  "name": "ipaddress.IPv4Network.hostmask",
  "category": "標準ライブラリ",
  "syntax": "net.hostmask",
  "description": "ホストマスク（ネットマスクのビット反転）。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Network('192.0.2.0/24').hostmask)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network.hostmask"
 },
 {
  "name": "ipaddress.IPv4Network.hosts",
  "category": "標準ライブラリ",
  "syntax": "net.hosts()",
  "description": "利用可能なホストアドレスのイテレータ。/31 では全アドレス、/32 ではそのアドレス自体を返す。",
  "example": "import ipaddress\nprint(list(ipaddress.IPv4Network('192.0.2.0/30').hosts()))",
  "caution": "要素数が100000件を超える場合は、本アプリでは結果を確定しません。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network.hosts"
 },
 {
  "name": "ipaddress.IPv4Network.is_link_local",
  "category": "標準ライブラリ",
  "syntax": "net.is_link_local",
  "description": "ネットワークアドレスとブロードキャストの両方がリンクローカル範囲内なら True。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Network('169.254.0.0/16').is_link_local)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network.is_link_local"
 },
 {
  "name": "ipaddress.IPv4Network.is_loopback",
  "category": "標準ライブラリ",
  "syntax": "net.is_loopback",
  "description": "両端ともループバック範囲内なら True。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Network('127.0.0.0/8').is_loopback)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network.is_loopback"
 },
 {
  "name": "ipaddress.IPv4Network.is_multicast",
  "category": "標準ライブラリ",
  "syntax": "net.is_multicast",
  "description": "両端ともマルチキャスト範囲内なら True。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Network('224.0.0.0/4').is_multicast)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network.is_multicast"
 },
 {
  "name": "ipaddress.IPv4Network.is_private",
  "category": "標準ライブラリ",
  "syntax": "net.is_private",
  "description": "両端とも同一のプライベート範囲内にあり、例外範囲に掛からない場合に True。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Network('192.168.0.0/16').is_private)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network.is_private"
 },
 {
  "name": "ipaddress.IPv4Network.is_reserved",
  "category": "標準ライブラリ",
  "syntax": "net.is_reserved",
  "description": "両端とも予約済み範囲内なら True。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Network('240.0.0.0/4').is_reserved)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network.is_reserved"
 },
 {
  "name": "ipaddress.IPv4Network.is_unspecified",
  "category": "標準ライブラリ",
  "syntax": "net.is_unspecified",
  "description": "両端とも未指定アドレス（0.0.0.0/32 のみ）なら True。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Network('0.0.0.0/32').is_unspecified)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network.is_unspecified"
 },
 {
  "name": "ipaddress.IPv4Network.max_prefixlen",
  "category": "標準ライブラリ",
  "syntax": "net.max_prefixlen",
  "description": "プレフィックス長の最大値（IPv4 では 32）。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Network('192.0.2.0/24').max_prefixlen)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network.max_prefixlen"
 },
 {
  "name": "ipaddress.IPv4Network.netmask",
  "category": "標準ライブラリ",
  "syntax": "net.netmask",
  "description": "ネットマスクのアドレス表現。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Network('192.0.2.0/24').netmask)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network.netmask"
 },
 {
  "name": "ipaddress.IPv4Network.network_address",
  "category": "標準ライブラリ",
  "syntax": "net.network_address",
  "description": "ネットワークアドレス。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Network('192.0.2.0/24').network_address)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network.network_address"
 },
 {
  "name": "ipaddress.IPv4Network.num_addresses",
  "category": "標準ライブラリ",
  "syntax": "net.num_addresses",
  "description": "ネットワークに含まれるアドレスの総数。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Network('192.0.2.0/24').num_addresses)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network.num_addresses"
 },
 {
  "name": "ipaddress.IPv4Network.overlaps",
  "category": "標準ライブラリ",
  "syntax": "net.overlaps(other)",
  "description": "other とアドレス範囲が重なっていれば True。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Network('192.0.2.0/24').overlaps(ipaddress.IPv4Network('192.0.2.128/25')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network.overlaps"
 },
 {
  "name": "ipaddress.IPv4Network.prefixlen",
  "category": "標準ライブラリ",
  "syntax": "net.prefixlen",
  "description": "プレフィックス長。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Network('192.0.2.0/24').prefixlen)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network.prefixlen"
 },
 {
  "name": "ipaddress.IPv4Network.subnet_of",
  "category": "標準ライブラリ",
  "syntax": "net.subnet_of(other)",
  "description": "このネットワークが other のサブネットなら True。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Network('192.0.2.0/25').subnet_of(ipaddress.IPv4Network('192.0.2.0/24')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network.subnet_of"
 },
 {
  "name": "ipaddress.IPv4Network.subnets",
  "category": "標準ライブラリ",
  "syntax": "net.subnets(prefixlen_diff=1, new_prefix=None)",
  "description": "このネットワークを分割したサブネット群のイテレータ。",
  "example": "import ipaddress\nprint(list(ipaddress.IPv4Network('192.0.2.0/24').subnets(new_prefix=26)))",
  "caution": "要素数が100000件を超える場合は、本アプリでは結果を確定しません。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network.subnets"
 },
 {
  "name": "ipaddress.IPv4Network.supernet",
  "category": "標準ライブラリ",
  "syntax": "net.supernet(prefixlen_diff=1, new_prefix=None)",
  "description": "このネットワークを含む上位ネットワーク。/0 の場合は自分自身を返す。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Network('192.0.2.0/24').supernet())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network.supernet"
 },
 {
  "name": "ipaddress.IPv4Network.supernet_of",
  "category": "標準ライブラリ",
  "syntax": "net.supernet_of(other)",
  "description": "このネットワークが other のスーパーネットなら True。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Network('192.0.2.0/24').supernet_of(ipaddress.IPv4Network('192.0.2.0/25')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network.supernet_of"
 },
 {
  "name": "ipaddress.IPv4Network.version",
  "category": "標準ライブラリ",
  "syntax": "net.version",
  "description": "IP バージョン（4）。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Network('192.0.2.0/24').version)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network.version"
 },
 {
  "name": "ipaddress.IPv4Network.with_hostmask",
  "category": "標準ライブラリ",
  "syntax": "net.with_hostmask",
  "description": "ネットワークアドレス/ホストマスク の文字列。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Network('192.0.2.0/24').with_hostmask)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network.with_hostmask"
 },
 {
  "name": "ipaddress.IPv4Network.with_netmask",
  "category": "標準ライブラリ",
  "syntax": "net.with_netmask",
  "description": "ネットワークアドレス/ネットマスク の文字列。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Network('192.0.2.0/24').with_netmask)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network.with_netmask"
 },
 {
  "name": "ipaddress.IPv4Network.with_prefixlen",
  "category": "標準ライブラリ",
  "syntax": "net.with_prefixlen",
  "description": "ネットワークアドレス/プレフィックス長 の文字列。",
  "example": "import ipaddress\nprint(ipaddress.IPv4Network('192.0.2.0/24').with_prefixlen)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv4Network.with_prefixlen"
 },
 {
  "name": "ipaddress.IPv6Address",
  "category": "標準ライブラリ",
  "syntax": "IPv6Address('2001:db8::1')",
  "description": "IPv6 アドレスを表すクラス。%スコープID 付き表記も受け付ける。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Address('2001:db8::1'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Address"
 },
 {
  "name": "ipaddress.IPv6Address.__format__",
  "category": "標準ライブラリ",
  "syntax": "format(addr, 'x')",
  "description": "書式指定でアドレスを文字列化する。s（通常表記）、b（2進）、x/X（16進）、n（v6では x と同じ）が使え、# と _ も指定できる。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Address('2001:db8::1').__format__('x'))",
  "caution": "組み込みの format() や f 文字列からは本アプリでは呼び出せないため、メソッドとして直接呼び出す形で使う。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Address.__format__"
 },
 {
  "name": "ipaddress.IPv6Address.compressed",
  "category": "標準ライブラリ",
  "syntax": "addr.compressed",
  "description": "圧縮表記（最長の 0 の連続を :: に置き換えた表記）。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Address('2001:db8::1').compressed)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Address.compressed"
 },
 {
  "name": "ipaddress.IPv6Address.exploded",
  "category": "標準ライブラリ",
  "syntax": "addr.exploded",
  "description": "展開表記（各ヘクステットを4桁0埋めした表記）。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Address('2001:db8::1').exploded)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Address.exploded"
 },
 {
  "name": "ipaddress.IPv6Address.ipv4_mapped",
  "category": "標準ライブラリ",
  "syntax": "addr.ipv4_mapped",
  "description": "IPv4 射影アドレス（::ffff:a.b.c.d）なら対応する IPv4Address、それ以外は None。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Address('::ffff:192.0.2.1').ipv4_mapped)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Address.ipv4_mapped"
 },
 {
  "name": "ipaddress.IPv6Address.is_global",
  "category": "標準ライブラリ",
  "syntax": "addr.is_global",
  "description": "グローバルに到達可能なアドレスなら True（is_private の反対）。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Address('2606:4700:4700::1111').is_global)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Address.is_global"
 },
 {
  "name": "ipaddress.IPv6Address.is_link_local",
  "category": "標準ライブラリ",
  "syntax": "addr.is_link_local",
  "description": "リンクローカル（fe80::/10）なら True。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Address('fe80::1').is_link_local)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Address.is_link_local"
 },
 {
  "name": "ipaddress.IPv6Address.is_loopback",
  "category": "標準ライブラリ",
  "syntax": "addr.is_loopback",
  "description": "ループバック（::1）なら True。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Address('::1').is_loopback)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Address.is_loopback"
 },
 {
  "name": "ipaddress.IPv6Address.is_multicast",
  "category": "標準ライブラリ",
  "syntax": "addr.is_multicast",
  "description": "マルチキャスト（ff00::/8）なら True。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Address('ff02::1').is_multicast)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Address.is_multicast"
 },
 {
  "name": "ipaddress.IPv6Address.is_private",
  "category": "標準ライブラリ",
  "syntax": "addr.is_private",
  "description": "IANA 特殊用途レジストリでグローバル到達不可とされる範囲なら True。IPv4 射影アドレスでは射影先 IPv4 の判定に従う。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Address('2001:db8::1').is_private)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Address.is_private"
 },
 {
  "name": "ipaddress.IPv6Address.is_reserved",
  "category": "標準ライブラリ",
  "syntax": "addr.is_reserved",
  "description": "IETF 予約済み範囲（::/8、100::/8、200::/7 など）なら True。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Address('100::1').is_reserved)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Address.is_reserved"
 },
 {
  "name": "ipaddress.IPv6Address.is_site_local",
  "category": "標準ライブラリ",
  "syntax": "addr.is_site_local",
  "description": "サイトローカル（fec0::/10、現在は非推奨）なら True。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Address('fec0::1').is_site_local)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Address.is_site_local"
 },
 {
  "name": "ipaddress.IPv6Address.is_unspecified",
  "category": "標準ライブラリ",
  "syntax": "addr.is_unspecified",
  "description": "未指定アドレス（::）なら True。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Address('::').is_unspecified)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Address.is_unspecified"
 },
 {
  "name": "ipaddress.IPv6Address.max_prefixlen",
  "category": "標準ライブラリ",
  "syntax": "addr.max_prefixlen",
  "description": "プレフィックス長の最大値（IPv6 では 128）。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Address('2001:db8::1').max_prefixlen)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Address.max_prefixlen"
 },
 {
  "name": "ipaddress.IPv6Address.packed",
  "category": "標準ライブラリ",
  "syntax": "addr.packed",
  "description": "アドレスのバイナリ表現（16 バイトの bytes）。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Address('::1').packed)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Address.packed"
 },
 {
  "name": "ipaddress.IPv6Address.reverse_pointer",
  "category": "標準ライブラリ",
  "syntax": "addr.reverse_pointer",
  "description": "逆引き DNS 名（ip6.arpa）。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Address('2001:db8::1').reverse_pointer)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Address.reverse_pointer"
 },
 {
  "name": "ipaddress.IPv6Address.scope_id",
  "category": "標準ライブラリ",
  "syntax": "addr.scope_id",
  "description": "スコープ ID（% の後ろの文字列）。無ければ None。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Address('fe80::1%eth0').scope_id)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Address.scope_id"
 },
 {
  "name": "ipaddress.IPv6Address.sixtofour",
  "category": "標準ライブラリ",
  "syntax": "addr.sixtofour",
  "description": "6to4 アドレス（2002::/16）なら埋め込まれた IPv4Address、それ以外は None。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Address('2002:c000:0201::1').sixtofour)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Address.sixtofour"
 },
 {
  "name": "ipaddress.IPv6Address.teredo",
  "category": "標準ライブラリ",
  "syntax": "addr.teredo",
  "description": "Teredo アドレス（2001::/32）なら (サーバ IPv4, 変換クライアント IPv4) のタプル、それ以外は None。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Address('2001:0000:4136:e378:8000:63bf:3fff:fdd2').teredo)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Address.teredo"
 },
 {
  "name": "ipaddress.IPv6Address.version",
  "category": "標準ライブラリ",
  "syntax": "addr.version",
  "description": "IP バージョン（6）。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Address('2001:db8::1').version)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Address.version"
 },
 {
  "name": "ipaddress.IPv6Interface",
  "category": "標準ライブラリ",
  "syntax": "IPv6Interface('2001:db8::1/64')",
  "description": "アドレスとネットワークの組を表すクラス（ホスト側の視点）。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Interface('2001:db8::1/64'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Interface"
 },
 {
  "name": "ipaddress.IPv6Interface.ip",
  "category": "標準ライブラリ",
  "syntax": "iface.ip",
  "description": "インタフェースのアドレス部分（IPv6Address、スコープ ID は付かない）。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Interface('2001:db8::1/64').ip)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Interface.ip"
 },
 {
  "name": "ipaddress.IPv6Interface.network",
  "category": "標準ライブラリ",
  "syntax": "iface.network",
  "description": "インタフェースが属するネットワーク（IPv6Network）。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Interface('2001:db8::1/64').network)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Interface.network"
 },
 {
  "name": "ipaddress.IPv6Interface.with_hostmask",
  "category": "標準ライブラリ",
  "syntax": "iface.with_hostmask",
  "description": "アドレス/ホストマスク の文字列。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Interface('2001:db8::1/64').with_hostmask)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Interface.with_hostmask"
 },
 {
  "name": "ipaddress.IPv6Interface.with_netmask",
  "category": "標準ライブラリ",
  "syntax": "iface.with_netmask",
  "description": "アドレス/ネットマスク の文字列。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Interface('2001:db8::1/64').with_netmask)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Interface.with_netmask"
 },
 {
  "name": "ipaddress.IPv6Interface.with_prefixlen",
  "category": "標準ライブラリ",
  "syntax": "iface.with_prefixlen",
  "description": "アドレス/プレフィックス長 の文字列。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Interface('2001:db8::1/64').with_prefixlen)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Interface.with_prefixlen"
 },
 {
  "name": "ipaddress.IPv6Network",
  "category": "標準ライブラリ",
  "syntax": "IPv6Network('2001:db8::/64')",
  "description": "IPv6 ネットワークを表すクラス。既定ではホストビットが立っていると ValueError（strict=False でマスクされる）。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Network('2001:db8::/64'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network"
 },
 {
  "name": "ipaddress.IPv6Network.address_exclude",
  "category": "標準ライブラリ",
  "syntax": "net.address_exclude(other)",
  "description": "other を除いた残りのネットワーク群を生成するイテレータ。生成順は分割の発見順（ソート順ではない）。",
  "example": "import ipaddress\nprint(list(ipaddress.IPv6Network('2001:db8::/126').address_exclude(ipaddress.IPv6Network('2001:db8::1/128'))))",
  "caution": "要素数が100000件を超える場合は、本アプリでは結果を確定しません。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.address_exclude"
 },
 {
  "name": "ipaddress.IPv6Network.broadcast_address",
  "category": "標準ライブラリ",
  "syntax": "net.broadcast_address",
  "description": "範囲の最終アドレス（IPv6 にブロードキャストの概念はないが範囲の末尾を返す）。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Network('2001:db8::/64').broadcast_address)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.broadcast_address"
 },
 {
  "name": "ipaddress.IPv6Network.compare_networks",
  "category": "標準ライブラリ",
  "syntax": "net.compare_networks(other)",
  "description": "ネットワークアドレス→ネットマスクの順で比較し -1/0/1 を返す。バージョンが違うと比較できない（TypeError）。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Network('2001:db8::/64').compare_networks(ipaddress.IPv6Network('2001:db8::/48')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.compare_networks"
 },
 {
  "name": "ipaddress.IPv6Network.compressed",
  "category": "標準ライブラリ",
  "syntax": "net.compressed",
  "description": "ネットワークの圧縮表記（アドレス/プレフィックス長）。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Network('2001:db8::/64').compressed)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.compressed"
 },
 {
  "name": "ipaddress.IPv6Network.exploded",
  "category": "標準ライブラリ",
  "syntax": "net.exploded",
  "description": "ネットワークの展開表記（アドレスを展開し /プレフィックス長 を付けたもの）。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Network('2001:db8::/64').exploded)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.exploded"
 },
 {
  "name": "ipaddress.IPv6Network.hostmask",
  "category": "標準ライブラリ",
  "syntax": "net.hostmask",
  "description": "ホストマスク（ネットマスクのビット反転）。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Network('2001:db8::/64').hostmask)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.hostmask"
 },
 {
  "name": "ipaddress.IPv6Network.hosts",
  "category": "標準ライブラリ",
  "syntax": "net.hosts()",
  "description": "ホストアドレスのイテレータ。ネットワークアドレスを除き、範囲の末尾までを含む。/127 では全アドレス、/128 ではそのアドレス自体を返す。",
  "example": "import ipaddress\nprint(list(ipaddress.IPv6Network('2001:db8::/127').hosts()))",
  "caution": "要素数が100000件を超える場合は、本アプリでは結果を確定しません。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.hosts"
 },
 {
  "name": "ipaddress.IPv6Network.is_link_local",
  "category": "標準ライブラリ",
  "syntax": "net.is_link_local",
  "description": "両端ともリンクローカル範囲内なら True。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Network('fe80::/10').is_link_local)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.is_link_local"
 },
 {
  "name": "ipaddress.IPv6Network.is_loopback",
  "category": "標準ライブラリ",
  "syntax": "net.is_loopback",
  "description": "両端ともループバック（::1/128 のみ）なら True。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Network('::1/128').is_loopback)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.is_loopback"
 },
 {
  "name": "ipaddress.IPv6Network.is_multicast",
  "category": "標準ライブラリ",
  "syntax": "net.is_multicast",
  "description": "両端ともマルチキャスト範囲内なら True。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Network('ff00::/8').is_multicast)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.is_multicast"
 },
 {
  "name": "ipaddress.IPv6Network.is_private",
  "category": "標準ライブラリ",
  "syntax": "net.is_private",
  "description": "両端とも同一のプライベート範囲内にあり、例外範囲に掛からない場合に True。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Network('2001:db8::/32').is_private)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.is_private"
 },
 {
  "name": "ipaddress.IPv6Network.is_reserved",
  "category": "標準ライブラリ",
  "syntax": "net.is_reserved",
  "description": "両端とも予約済み範囲内なら True。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Network('100::/8').is_reserved)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.is_reserved"
 },
 {
  "name": "ipaddress.IPv6Network.is_site_local",
  "category": "標準ライブラリ",
  "syntax": "net.is_site_local",
  "description": "両端ともサイトローカル範囲内なら True。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Network('fec0::/10').is_site_local)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.is_site_local"
 },
 {
  "name": "ipaddress.IPv6Network.is_unspecified",
  "category": "標準ライブラリ",
  "syntax": "net.is_unspecified",
  "description": "両端とも未指定アドレス（::/128 のみ）なら True。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Network('::/128').is_unspecified)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.is_unspecified"
 },
 {
  "name": "ipaddress.IPv6Network.max_prefixlen",
  "category": "標準ライブラリ",
  "syntax": "net.max_prefixlen",
  "description": "プレフィックス長の最大値（IPv6 では 128）。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Network('2001:db8::/64').max_prefixlen)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.max_prefixlen"
 },
 {
  "name": "ipaddress.IPv6Network.netmask",
  "category": "標準ライブラリ",
  "syntax": "net.netmask",
  "description": "ネットマスクのアドレス表現。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Network('2001:db8::/64').netmask)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.netmask"
 },
 {
  "name": "ipaddress.IPv6Network.network_address",
  "category": "標準ライブラリ",
  "syntax": "net.network_address",
  "description": "ネットワークアドレス。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Network('2001:db8::/64').network_address)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.network_address"
 },
 {
  "name": "ipaddress.IPv6Network.num_addresses",
  "category": "標準ライブラリ",
  "syntax": "net.num_addresses",
  "description": "ネットワークに含まれるアドレスの総数。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Network('2001:db8::/120').num_addresses)",
  "caution": "エンジンの数値で正確に表せない大きな個数（おおよそ 2**53 以上）は、本アプリでは確定しません。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.num_addresses"
 },
 {
  "name": "ipaddress.IPv6Network.overlaps",
  "category": "標準ライブラリ",
  "syntax": "net.overlaps(other)",
  "description": "other とアドレス範囲が重なっていれば True。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Network('2001:db8::/64').overlaps(ipaddress.IPv6Network('2001:db8::/65')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.overlaps"
 },
 {
  "name": "ipaddress.IPv6Network.prefixlen",
  "category": "標準ライブラリ",
  "syntax": "net.prefixlen",
  "description": "プレフィックス長。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Network('2001:db8::/64').prefixlen)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.prefixlen"
 },
 {
  "name": "ipaddress.IPv6Network.subnet_of",
  "category": "標準ライブラリ",
  "syntax": "net.subnet_of(other)",
  "description": "このネットワークが other のサブネットなら True。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Network('2001:db8::/65').subnet_of(ipaddress.IPv6Network('2001:db8::/64')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.subnet_of"
 },
 {
  "name": "ipaddress.IPv6Network.subnets",
  "category": "標準ライブラリ",
  "syntax": "net.subnets(prefixlen_diff=1, new_prefix=None)",
  "description": "このネットワークを分割したサブネット群のイテレータ。",
  "example": "import ipaddress\nprint(list(ipaddress.IPv6Network('2001:db8::/64').subnets(new_prefix=66)))",
  "caution": "要素数が100000件を超える場合は、本アプリでは結果を確定しません。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.subnets"
 },
 {
  "name": "ipaddress.IPv6Network.supernet",
  "category": "標準ライブラリ",
  "syntax": "net.supernet(prefixlen_diff=1, new_prefix=None)",
  "description": "このネットワークを含む上位ネットワーク。/0 の場合は自分自身を返す。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Network('2001:db8::/64').supernet())",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.supernet"
 },
 {
  "name": "ipaddress.IPv6Network.supernet_of",
  "category": "標準ライブラリ",
  "syntax": "net.supernet_of(other)",
  "description": "このネットワークが other のスーパーネットなら True。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Network('2001:db8::/64').supernet_of(ipaddress.IPv6Network('2001:db8::/65')))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.supernet_of"
 },
 {
  "name": "ipaddress.IPv6Network.version",
  "category": "標準ライブラリ",
  "syntax": "net.version",
  "description": "IP バージョン（6）。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Network('2001:db8::/64').version)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.version"
 },
 {
  "name": "ipaddress.IPv6Network.with_hostmask",
  "category": "標準ライブラリ",
  "syntax": "net.with_hostmask",
  "description": "ネットワークアドレス/ホストマスク の文字列。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Network('2001:db8::/64').with_hostmask)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.with_hostmask"
 },
 {
  "name": "ipaddress.IPv6Network.with_netmask",
  "category": "標準ライブラリ",
  "syntax": "net.with_netmask",
  "description": "ネットワークアドレス/ネットマスク の文字列。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Network('2001:db8::/64').with_netmask)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.with_netmask"
 },
 {
  "name": "ipaddress.IPv6Network.with_prefixlen",
  "category": "標準ライブラリ",
  "syntax": "net.with_prefixlen",
  "description": "ネットワークアドレス/プレフィックス長 の文字列。",
  "example": "import ipaddress\nprint(ipaddress.IPv6Network('2001:db8::/64').with_prefixlen)",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.IPv6Network.with_prefixlen"
 },
 {
  "name": "ipaddress.collapse_addresses",
  "category": "標準ライブラリ",
  "syntax": "collapse_addresses(addresses)",
  "description": "アドレス／ネットワークの列を、重なりや隣接をまとめた最小のネットワーク列にするイテレータ。",
  "example": "import ipaddress\nprint(list(ipaddress.collapse_addresses([ipaddress.IPv4Network('192.0.2.0/25'), ipaddress.IPv4Network('192.0.2.128/25')])))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.collapse_addresses"
 },
 {
  "name": "ipaddress.get_mixed_type_key",
  "category": "標準ライブラリ",
  "syntax": "get_mixed_type_key(obj)",
  "description": "アドレスとネットワークを混ぜてソートするためのキー関数。ネットワークは (version, ネットワークアドレス, ネットマスク)、アドレスは (version, アドレス) を返す。",
  "example": "import ipaddress\nprint(ipaddress.get_mixed_type_key(ipaddress.IPv4Address('1.2.3.4')))",
  "caution": "IP オブジェクト以外には NotImplemented を返すが、本アプリでは NotImplemented の値を表現できないため未確定として扱う。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.get_mixed_type_key"
 },
 {
  "name": "ipaddress.ip_address",
  "category": "標準ライブラリ",
  "syntax": "ip_address(address)",
  "description": "文字列・整数から IPv4Address か IPv6Address の適切な方を返す。整数が 2**32 未満なら IPv4 と判断する。",
  "example": "import ipaddress\nprint(ipaddress.ip_address('192.0.2.1'))",
  "caution": "どちらでも解釈できない場合は ValueError。",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.ip_address"
 },
 {
  "name": "ipaddress.ip_interface",
  "category": "標準ライブラリ",
  "syntax": "ip_interface(address)",
  "description": "文字列・整数から IPv4Interface か IPv6Interface の適切な方を返す。",
  "example": "import ipaddress\nprint(ipaddress.ip_interface('192.0.2.1/24'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.ip_interface"
 },
 {
  "name": "ipaddress.ip_network",
  "category": "標準ライブラリ",
  "syntax": "ip_network(address, strict=True)",
  "description": "文字列・整数から IPv4Network か IPv6Network の適切な方を返す。",
  "example": "import ipaddress\nprint(ipaddress.ip_network('192.0.2.0/24'))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.ip_network"
 },
 {
  "name": "ipaddress.summarize_address_range",
  "category": "標準ライブラリ",
  "syntax": "summarize_address_range(first, last)",
  "description": "first から last までのアドレス範囲を最小のネットワーク列で表すイテレータ。",
  "example": "import ipaddress\nprint(list(ipaddress.summarize_address_range(ipaddress.IPv4Address('192.0.2.0'), ipaddress.IPv4Address('192.0.2.130'))))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.summarize_address_range"
 },
 {
  "name": "ipaddress.v4_int_to_packed",
  "category": "標準ライブラリ",
  "syntax": "v4_int_to_packed(address)",
  "description": "整数を 4 バイトの packed 表現に変換する。範囲外は ValueError。",
  "example": "import ipaddress\nprint(ipaddress.v4_int_to_packed(3232235521))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.v4_int_to_packed"
 },
 {
  "name": "ipaddress.v6_int_to_packed",
  "category": "標準ライブラリ",
  "syntax": "v6_int_to_packed(address)",
  "description": "整数を 16 バイトの packed 表現に変換する。範囲外は ValueError。",
  "example": "import ipaddress\nprint(ipaddress.v6_int_to_packed(1))",
  "caution": "",
  "status": "supported",
  "source": "https://docs.python.org/ja/3.15/library/ipaddress.html#ipaddress.v6_int_to_packed"
 },
];
