{{- define "tests-untp-ri.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "tests-untp-ri.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "tests-untp-ri.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "tests-untp-ri.labels" -}}
helm.sh/chart: {{ include "tests-untp-ri.chart" . }}
{{ include "tests-untp-ri.selectorLabels" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "tests-untp-ri.selectorLabels" -}}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "tests-untp-ri.componentLabels" -}}
{{ include "tests-untp-ri.labels" . }}
app.kubernetes.io/component: {{ .component }}
{{- end -}}

{{- define "tests-untp-ri.componentSelectorLabels" -}}
{{ include "tests-untp-ri.selectorLabels" . }}
app.kubernetes.io/component: {{ .component }}
{{- end -}}

{{- define "tests-untp-ri.secretName" -}}
{{- coalesce .Values.secrets.existingSecret (printf "%s-secrets" (include "tests-untp-ri.fullname" .)) -}}
{{- end -}}

{{- define "tests-untp-ri.ri.publicUrl" -}}
{{- if .Values.route.ri.host -}}
https://{{ .Values.route.ri.host }}
{{- else -}}
http://localhost:3003
{{- end -}}
{{- end -}}

{{- define "tests-untp-ri.keycloak.publicUrl" -}}
{{- if .Values.route.keycloak.host -}}
https://{{ .Values.route.keycloak.host }}
{{- else -}}
http://localhost:8080
{{- end -}}
{{- end -}}

{{- define "tests-untp-ri.riDb.fullname" -}}
{{- printf "%s-ri-db" (include "tests-untp-ri.fullname" .) -}}
{{- end -}}

{{- define "tests-untp-ri.vckitDb.fullname" -}}
{{- printf "%s-vckit-db" (include "tests-untp-ri.fullname" .) -}}
{{- end -}}

{{- define "tests-untp-ri.keycloak.fullname" -}}
{{- printf "%s-keycloak" (include "tests-untp-ri.fullname" .) -}}
{{- end -}}

{{- define "tests-untp-ri.vckit.fullname" -}}
{{- printf "%s-vckit" (include "tests-untp-ri.fullname" .) -}}
{{- end -}}

{{- define "tests-untp-ri.storage.fullname" -}}
{{- printf "%s-storage" (include "tests-untp-ri.fullname" .) -}}
{{- end -}}

{{- define "tests-untp-ri.idr.fullname" -}}
{{- printf "%s-idr" (include "tests-untp-ri.fullname" .) -}}
{{- end -}}

{{- define "tests-untp-ri.minio.fullname" -}}
{{- printf "%s-minio" (include "tests-untp-ri.fullname" .) -}}
{{- end -}}

{{- define "tests-untp-ri.ri.fullname" -}}
{{- printf "%s-ri" (include "tests-untp-ri.fullname" .) -}}
{{- end -}}

{{- define "tests-untp-ri.riDb.host" -}}
{{- printf "%s.%s.svc.cluster.local" (include "tests-untp-ri.riDb.fullname" .) .Release.Namespace -}}
{{- end -}}

{{- define "tests-untp-ri.vckitDb.host" -}}
{{- printf "%s.%s.svc.cluster.local" (include "tests-untp-ri.vckitDb.fullname" .) .Release.Namespace -}}
{{- end -}}

{{- define "tests-untp-ri.keycloak.host" -}}
{{- printf "%s.%s.svc.cluster.local" (include "tests-untp-ri.keycloak.fullname" .) .Release.Namespace -}}
{{- end -}}

{{- define "tests-untp-ri.vckit.host" -}}
{{- printf "%s.%s.svc.cluster.local" (include "tests-untp-ri.vckit.fullname" .) .Release.Namespace -}}
{{- end -}}

{{- define "tests-untp-ri.storage.host" -}}
{{- printf "%s.%s.svc.cluster.local" (include "tests-untp-ri.storage.fullname" .) .Release.Namespace -}}
{{- end -}}

{{- define "tests-untp-ri.idr.host" -}}
{{- printf "%s.%s.svc.cluster.local" (include "tests-untp-ri.idr.fullname" .) .Release.Namespace -}}
{{- end -}}

{{- define "tests-untp-ri.minio.host" -}}
{{- printf "%s.%s.svc.cluster.local" (include "tests-untp-ri.minio.fullname" .) .Release.Namespace -}}
{{- end -}}

{{- define "getSecretValue" -}}
{{- $obj := (lookup "v1" "Secret" .Namespace .Name).data -}}
{{- if $obj -}}
{{- index $obj .Key -}}
{{- end -}}
{{- end -}}
