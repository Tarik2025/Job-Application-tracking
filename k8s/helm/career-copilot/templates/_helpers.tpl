{{- define "career-copilot.name" -}}
{{- default .Chart.Name .Values.nameOverride -}}
{{- end -}}

{{- define "career-copilot.fullname" -}}
{{- printf "%s" (include "career-copilot.name" .) -}}
{{- end -}}
