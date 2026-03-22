---
title: "Variational Autoencoders (VAE)"
description: "VAE fundamentals, the reparameterization trick, and their role in latent diffusion models"
duration_minutes: 14
order: 2
---

## The Autoencoder Baseline

A standard autoencoder compresses data to a bottleneck (latent code) and reconstructs it:

```python
import torch
import torch.nn as nn

class Autoencoder(nn.Module):
    def __init__(self, input_dim=784, latent_dim=32):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.ReLU(),
            nn.Linear(256, latent_dim),
        )
        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, 256),
            nn.ReLU(),
            nn.Linear(256, input_dim),
            nn.Sigmoid(),
        )

    def forward(self, x):
        z = self.encoder(x)
        return self.decoder(z)
```

**Problem**: The latent space is unstructured. Interpolating between two latent codes or sampling a random code produces garbage outputs.

## The VAE: Adding Structure to Latent Space

A VAE (Kingma & Welling, 2013) encodes inputs as **distributions** rather than points:

```python
class VAE(nn.Module):
    def __init__(self, input_dim=784, latent_dim=32):
        super().__init__()
        # Encoder outputs mean and log-variance
        self.encoder = nn.Sequential(nn.Linear(input_dim, 256), nn.ReLU())
        self.fc_mu = nn.Linear(256, latent_dim)
        self.fc_logvar = nn.Linear(256, latent_dim)

        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, 256),
            nn.ReLU(),
            nn.Linear(256, input_dim),
            nn.Sigmoid(),
        )

    def encode(self, x):
        h = self.encoder(x)
        return self.fc_mu(h), self.fc_logvar(h)

    def reparameterize(self, mu, logvar):
        """
        Reparameterization trick: z = mu + eps * std
        Allows gradients to flow through the sampling operation.
        """
        std = torch.exp(0.5 * logvar)
        eps = torch.randn_like(std)  # Sample from N(0, 1)
        return mu + eps * std        # Equivalent to sampling N(mu, std²)

    def decode(self, z):
        return self.decoder(z)

    def forward(self, x):
        mu, logvar = self.encode(x)
        z = self.reparameterize(mu, logvar)
        reconstruction = self.decode(z)
        return reconstruction, mu, logvar
```

## The ELBO Loss

VAEs optimize the Evidence Lower BOund (ELBO), which has two terms:

```python
def vae_loss(reconstruction, x, mu, logvar, beta=1.0):
    """
    ELBO = Reconstruction loss + KL divergence

    - Reconstruction: how well the decoder reconstructs the input
    - KL: how close is q(z|x) to the prior p(z) = N(0,1)
    """
    # Reconstruction loss (binary cross-entropy for pixel values in [0,1])
    recon_loss = nn.functional.binary_cross_entropy(
        reconstruction, x, reduction="sum"
    )

    # KL divergence: KL[N(mu, var) || N(0,1)]
    # = -0.5 * sum(1 + log(var) - mu² - var)
    kl_loss = -0.5 * torch.sum(1 + logvar - mu.pow(2) - logvar.exp())

    # beta-VAE: beta > 1 encourages disentangled representations
    return recon_loss + beta * kl_loss
```

The KL term forces the latent space to be "well-organized" — approximately Gaussian. This enables:
- **Sampling**: draw z ~ N(0,1), decode to get realistic images
- **Interpolation**: smooth transitions between codes

## β-VAE: Disentangled Representations

Setting β > 1 encourages each latent dimension to encode an independent factor:

```python
# With β = 10, the VAE learns disentangled factors:
# z[0] → object shape
# z[1] → lighting direction
# z[2] → object color
# z[3] → background texture

# Modify one dimension while holding others fixed:
z = encode(image)
z_modified = z.clone()
z_modified[:, 0] += 2.0  # Change only the shape factor
new_image = decode(z_modified)
```

## VAE for Image Generation: Architecture

For images, we use convolutional encoders/decoders:

```python
class ConvVAE(nn.Module):
    def __init__(self, latent_dim=256):
        super().__init__()
        # Encoder: image → latent
        self.encoder = nn.Sequential(
            nn.Conv2d(3, 64, 4, stride=2, padding=1),   # 256→128
            nn.LeakyReLU(0.2),
            nn.Conv2d(64, 128, 4, stride=2, padding=1),  # 128→64
            nn.LeakyReLU(0.2),
            nn.Conv2d(128, 256, 4, stride=2, padding=1), # 64→32
            nn.LeakyReLU(0.2),
            nn.Flatten(),
        )
        self.fc_mu = nn.Linear(256*32*32, latent_dim)
        self.fc_logvar = nn.Linear(256*32*32, latent_dim)

        # Decoder: latent → image
        self.fc_decode = nn.Linear(latent_dim, 256*32*32)
        self.decoder = nn.Sequential(
            nn.ConvTranspose2d(256, 128, 4, stride=2, padding=1),
            nn.ReLU(),
            nn.ConvTranspose2d(128, 64, 4, stride=2, padding=1),
            nn.ReLU(),
            nn.ConvTranspose2d(64, 3, 4, stride=2, padding=1),
            nn.Sigmoid(),
        )
```

## VAE as the Foundation for Latent Diffusion

The VAE's most important role today is as a **compression layer** for diffusion models:

```
Original image [512×512×3]
    ↓ VAE Encoder (4× compression per spatial dim)
Latent code [64×64×4]
    ↓ Diffusion process operates here (much cheaper!)
Latent code [64×64×4]
    ↓ VAE Decoder
Reconstructed image [512×512×3]
```

Stable Diffusion's VAE (from Rombach et al., 2022) achieves 8× spatial compression with high reconstruction fidelity. Training the diffusion model in latent space is ~48× cheaper in memory than pixel space.

## Key Takeaways

- VAEs encode inputs as distributions (mean + variance) over latent space
- The reparameterization trick allows backpropagation through sampling
- ELBO loss balances reconstruction quality against latent space regularity (KL)
- β-VAE (β > 1) encourages disentangled representations
- In modern pipelines, VAEs serve as compression layers for latent diffusion models
