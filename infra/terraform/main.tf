terraform {
  required_version = ">= 1.7.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.32"
    }
  }
}

provider "kubernetes" {
  host                   = var.kubernetes_host
  token                  = var.kubernetes_token
  cluster_ca_certificate = base64decode(var.kubernetes_cluster_ca_certificate)
}

resource "kubernetes_namespace_v1" "audio_analysis" {
  metadata {
    name = var.namespace
  }
}

resource "kubernetes_config_map_v1" "audio_analysis" {
  metadata {
    name      = "audio-analysis-config"
    namespace = kubernetes_namespace_v1.audio_analysis.metadata[0].name
  }

  data = {
    LOG_LEVEL       = var.log_level
    SERVICE_PORT    = tostring(var.service_port)
    AUDIO_MODEL_NAME = var.audio_model_name
  }
}

resource "kubernetes_secret_v1" "audio_analysis" {
  metadata {
    name      = "audio-analysis-secret"
    namespace = kubernetes_namespace_v1.audio_analysis.metadata[0].name
  }

  type = "Opaque"

  data = {
    MODEL_API_KEY     = var.model_api_key
    STORAGE_ACCESS_KEY = var.storage_access_key
  }
}

# Cluster and ingress controller provisioning should be handled by the target cloud.
# This skeleton focuses on namespace + shared configuration so it can adapt to GKE, EKS, or AKS later.

