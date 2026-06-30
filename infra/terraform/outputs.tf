output "namespace" {
  value = kubernetes_namespace_v1.audio_analysis.metadata[0].name
}

output "config_map_name" {
  value = kubernetes_config_map_v1.audio_analysis.metadata[0].name
}

output "secret_name" {
  value = kubernetes_secret_v1.audio_analysis.metadata[0].name
}

