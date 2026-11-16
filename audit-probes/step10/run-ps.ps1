param([string]$Cases,[string]$Result)
$ErrorActionPreference='Stop'
$rows=Get-Content -LiteralPath $Cases -Raw | ConvertFrom-Json
$all=[System.Collections.Generic.List[object]]::new()
function Normalize-R7($v) {
 if($null -eq $v){return $null}
 if($v -is [System.Management.Automation.InformationRecord]){return @{kind='information';text=$v.MessageData.ToString()}}
 if($v -is [string] -or $v -is [bool] -or $v -is [ValueType]){return $v}
 if($v -is [System.IO.FileSystemInfo]){return @{Name=$v.Name;FullName=$v.FullName;Extension=$v.Extension;PSIsContainer=$v.PSIsContainer;Length=if($v -is [IO.FileInfo]){$v.Length}else{$null}}}
 if($v -is [System.Management.Automation.PathInfo]){return @{Path=$v.Path}}
 if($v -is [System.Collections.IDictionary]){return $v}
 $props=[ordered]@{};foreach($prop in $v.PSObject.Properties){if($prop.MemberType -in 'Property','NoteProperty'){$props[$prop.Name]=$prop.Value}}
 if($props.Count){return $props};return $v.ToString()
}
foreach($row in $rows){
 if($row.kind -ne 'powershell'){continue}
 $folder=Join-Path ([IO.Path]::GetTempPath()) ('codex-r7-'+[guid]::NewGuid().ToString('N'))
 [IO.Directory]::CreateDirectory($folder)|Out-Null
 foreach($f in $row.model.files){$rel=$f.path.Substring(11).TrimStart('\');$path=if($rel){Join-Path $folder $rel}else{$folder};if($f.type -eq 'directory'){[IO.Directory]::CreateDirectory($path)|Out-Null}else{[IO.File]::WriteAllText($path,$f.content,[Text.UTF8Encoding]::new($false))}}
 Push-Location -LiteralPath $folder
 $vals=[System.Collections.Generic.List[object]]::new();$failure=$null;$clock=[Diagnostics.Stopwatch]::StartNew()
 try {& ([scriptblock]::Create($row.code)) 6>&1 | ForEach-Object {$vals.Add((Normalize-R7 $_))}} catch {$failure=@{message=$_.Exception.Message;type=$_.Exception.GetType().FullName;fqid=$_.FullyQualifiedErrorId}}
 $clock.Stop();$tree=[System.Collections.Generic.List[object]]::new()
 foreach($file in [IO.Directory]::EnumerateFileSystemEntries($folder,'*',[IO.SearchOption]::AllDirectories)){
  $isDir=[IO.Directory]::Exists($file);$e=@{path=$file.Replace($folder,'C:\Practice');type=if($isDir){'directory'}else{'file'}}
  if(!$isDir){$e.content=[IO.File]::ReadAllText($file,[Text.Encoding]::UTF8);$e.length=([IO.FileInfo]::new($file)).Length};$tree.Add($e)
 }
 $all.Add(@{id=$row.id;outputs=$vals.ToArray();error=$failure;files=$tree.ToArray();ms=$clock.Elapsed.TotalMilliseconds;root=$folder})
 Pop-Location;Remove-Item -LiteralPath $folder -Recurse -Force
}
@{version=$PSVersionTable.PSVersion.ToString();os=[Environment]::OSVersion.VersionString;rows=$all.ToArray()} | ConvertTo-Json -Depth 25 -Compress | Set-Content -LiteralPath $Result -Encoding utf8
