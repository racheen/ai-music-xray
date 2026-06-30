# Terraform Infrastructure

This folder contains a provider-agnostic Kubernetes deployment skeleton for the audio analysis service.

## What it provisions

- a namespace for the service
- a ConfigMap for non-sensitive runtime settings
- a Secret placeholder for sensitive values

## What it does not provision

The cluster itself is intentionally left to the target platform:

- GKE
- EKS
- AKS

That keeps the stack portable and makes it easier to adapt to your preferred cloud later.

## Expected workflow

1. Provision a Kubernetes cluster with your cloud provider.
2. Export Kubernetes credentials into Terraform variables.
3. Run `terraform init`.
4. Run `terraform plan`.
5. Run `terraform apply`.
6. Apply the manifests in `k8s/` or convert them into Terraform-managed workloads later.

## Notes

- The variables use placeholders so you can connect a real registry, secrets store, and ingress strategy later.
- The deployment resources are kept outside Terraform on purpose so the manifests can be reused in GitOps, Helm, or cloud-specific pipelines.

