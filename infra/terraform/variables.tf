variable "namespace" {
  type    = string
  default = "ai-music-xray"
}

variable "kubernetes_host" {
  type = string
}

variable "kubernetes_token" {
  type      = string
  sensitive = true
}

variable "kubernetes_cluster_ca_certificate" {
  type      = string
  sensitive = true
}

variable "log_level" {
  type    = string
  default = "info"
}

variable "service_port" {
  type    = number
  default = 8000
}

variable "audio_model_name" {
  type    = string
  default = "placeholder-librosa-pipeline"
}

variable "model_api_key" {
  type      = string
  sensitive = true
  default   = "replace-me"
}

variable "storage_access_key" {
  type      = string
  sensitive = true
  default   = "replace-me"
}

