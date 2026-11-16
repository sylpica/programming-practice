
audEnv <- function(e) { n<-ls(e,all.names=TRUE); if(!length(n)) return('{}'); paste0('{',paste(paste0(audQuote(n),':',vapply(n,function(k)audEncode(get(k,e,inherits=FALSE)),'')),collapse=','),'}') }
audQuote <- function(x) encodeString(x,quote='"')
audAtom <- function(x) {
 if(is.na(x)&&!is.nan(x)) return('{"kind":"NA"}')
 if(is.character(x)) return(audQuote(x))
 if(is.logical(x)) return(if(x) 'true' else 'false')
 if(is.nan(x)) return('"NaN"')
 if(is.infinite(x)) return(if(x>0) '"Inf"' else '"-Inf"')
 format(x,scientific=TRUE,trim=TRUE,digits=17)
}
audArray <- function(x) paste0('[',paste(vapply(seq_along(x),function(i)audAtom(x[i]),''),collapse=','),']')
audEncode <- function(x) {
 if(is.null(x)) return('{"kind":"null"}')
 if(is.data.frame(x)) {
  cols <- if(length(x)==0) '' else paste(paste0(audQuote(names(x)),':',vapply(x,audEncode,'')),collapse=',')
  return(paste0('{"kind":"data.frame","rows":',nrow(x),',"columns":{',cols,'}}'))
 }
 if(is.list(x)) return(paste0('{"kind":"list","values":[',paste(vapply(x,audEncode,''),collapse=','),']}'))
 nm <- names(x)
 paste0('{"kind":"atomic","type":',audQuote(typeof(x)),',"values":',audArray(x),',"names":',if(is.null(nm))'null'else audArray(nm),',"dim":',if(is.null(dim(x)))'null'else audArray(dim(x)),'}')
}

tryCatch({ e<-new.env(); warnings<-character(); o<-capture.output(withCallingHandlers(eval(parse(text="TRUE <- 7\nprint(TRUE)\na <- TRUE"),e),warning=function(w){warnings<<-c(warnings,conditionMessage(w));invokeRestart("muffleWarning")}));cat("0\t","{\"value\":",audEncode(e$a),",\"output\":",audArray(o),",\"warnings\":",audArray(warnings),",\"vars\":",audEnv(e),"}\n",sep="")},error=function(e)cat("0\t","{\"error\":",audQuote(conditionMessage(e)),"}\n",sep=""))
tryCatch({ e<-new.env(); warnings<-character(); o<-capture.output(withCallingHandlers(eval(parse(text="FALSE <- 7\nprint(FALSE)\na <- FALSE"),e),warning=function(w){warnings<<-c(warnings,conditionMessage(w));invokeRestart("muffleWarning")}));cat("1\t","{\"value\":",audEncode(e$a),",\"output\":",audArray(o),",\"warnings\":",audArray(warnings),",\"vars\":",audEnv(e),"}\n",sep="")},error=function(e)cat("1\t","{\"error\":",audQuote(conditionMessage(e)),"}\n",sep=""))
tryCatch({ e<-new.env(); warnings<-character(); o<-capture.output(withCallingHandlers(eval(parse(text="NULL <- 7\nprint(NULL)\na <- NULL"),e),warning=function(w){warnings<<-c(warnings,conditionMessage(w));invokeRestart("muffleWarning")}));cat("2\t","{\"value\":",audEncode(e$a),",\"output\":",audArray(o),",\"warnings\":",audArray(warnings),",\"vars\":",audEnv(e),"}\n",sep="")},error=function(e)cat("2\t","{\"error\":",audQuote(conditionMessage(e)),"}\n",sep=""))
tryCatch({ e<-new.env(); warnings<-character(); o<-capture.output(withCallingHandlers(eval(parse(text="NA <- 7\nprint(NA)\na <- NA"),e),warning=function(w){warnings<<-c(warnings,conditionMessage(w));invokeRestart("muffleWarning")}));cat("3\t","{\"value\":",audEncode(e$a),",\"output\":",audArray(o),",\"warnings\":",audArray(warnings),",\"vars\":",audEnv(e),"}\n",sep="")},error=function(e)cat("3\t","{\"error\":",audQuote(conditionMessage(e)),"}\n",sep=""))
tryCatch({ e<-new.env(); warnings<-character(); o<-capture.output(withCallingHandlers(eval(parse(text="NaN <- 7\nprint(NaN)\na <- NaN"),e),warning=function(w){warnings<<-c(warnings,conditionMessage(w));invokeRestart("muffleWarning")}));cat("4\t","{\"value\":",audEncode(e$a),",\"output\":",audArray(o),",\"warnings\":",audArray(warnings),",\"vars\":",audEnv(e),"}\n",sep="")},error=function(e)cat("4\t","{\"error\":",audQuote(conditionMessage(e)),"}\n",sep=""))
tryCatch({ e<-new.env(); warnings<-character(); o<-capture.output(withCallingHandlers(eval(parse(text="Inf <- 7\nprint(Inf)\na <- Inf"),e),warning=function(w){warnings<<-c(warnings,conditionMessage(w));invokeRestart("muffleWarning")}));cat("5\t","{\"value\":",audEncode(e$a),",\"output\":",audArray(o),",\"warnings\":",audArray(warnings),",\"vars\":",audEnv(e),"}\n",sep="")},error=function(e)cat("5\t","{\"error\":",audQuote(conditionMessage(e)),"}\n",sep=""))
tryCatch({ e<-new.env(); warnings<-character(); o<-capture.output(withCallingHandlers(eval(parse(text="T <- 7\nprint(T)\na <- T"),e),warning=function(w){warnings<<-c(warnings,conditionMessage(w));invokeRestart("muffleWarning")}));cat("6\t","{\"value\":",audEncode(e$a),",\"output\":",audArray(o),",\"warnings\":",audArray(warnings),",\"vars\":",audEnv(e),"}\n",sep="")},error=function(e)cat("6\t","{\"error\":",audQuote(conditionMessage(e)),"}\n",sep=""))
tryCatch({ e<-new.env(); warnings<-character(); o<-capture.output(withCallingHandlers(eval(parse(text="F <- 7\nprint(F)\na <- F"),e),warning=function(w){warnings<<-c(warnings,conditionMessage(w));invokeRestart("muffleWarning")}));cat("7\t","{\"value\":",audEncode(e$a),",\"output\":",audArray(o),",\"warnings\":",audArray(warnings),",\"vars\":",audEnv(e),"}\n",sep="")},error=function(e)cat("7\t","{\"error\":",audQuote(conditionMessage(e)),"}\n",sep=""))