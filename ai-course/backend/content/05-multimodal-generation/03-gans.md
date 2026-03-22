---
title: "Generative Adversarial Networks (GANs)"
description: "GAN training dynamics, architectures, mode collapse, and the progression to StyleGAN"
duration_minutes: 14
order: 3
---

## The GAN Framework

A GAN (Goodfellow et al., 2014) consists of two competing networks:

- **Generator G**: maps random noise z → fake image
- **Discriminator D**: classifies real vs. fake images

They play a minimax game:

```
min_G max_D  E[log D(x)] + E[log(1 - D(G(z)))]
```

The generator tries to fool the discriminator; the discriminator tries to catch fakes.

```python
import torch
import torch.nn as nn

class Generator(nn.Module):
    def __init__(self, latent_dim=100, img_channels=3, img_size=64):
        super().__init__()
        self.net = nn.Sequential(
            # Input: (latent_dim, 1, 1)
            nn.ConvTranspose2d(latent_dim, 512, 4, 1, 0),
            nn.BatchNorm2d(512),
            nn.ReLU(True),
            nn.ConvTranspose2d(512, 256, 4, 2, 1),
            nn.BatchNorm2d(256),
            nn.ReLU(True),
            nn.ConvTranspose2d(256, 128, 4, 2, 1),
            nn.BatchNorm2d(128),
            nn.ReLU(True),
            nn.ConvTranspose2d(128, img_channels, 4, 2, 1),
            nn.Tanh(),  # Output in [-1, 1]
        )

    def forward(self, z):
        return self.net(z.view(-1, z.size(1), 1, 1))


class Discriminator(nn.Module):
    def __init__(self, img_channels=3):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(img_channels, 64, 4, 2, 1),
            nn.LeakyReLU(0.2),
            nn.Conv2d(64, 128, 4, 2, 1),
            nn.BatchNorm2d(128),
            nn.LeakyReLU(0.2),
            nn.Conv2d(128, 256, 4, 2, 1),
            nn.BatchNorm2d(256),
            nn.LeakyReLU(0.2),
            nn.Conv2d(256, 1, 4, 1, 0),
            nn.Sigmoid(),
        )

    def forward(self, img):
        return self.net(img).view(-1)
```

## GAN Training Loop

```python
def train_gan(generator, discriminator, dataloader, n_epochs=100):
    g_optimizer = torch.optim.Adam(generator.parameters(), lr=2e-4, betas=(0.5, 0.999))
    d_optimizer = torch.optim.Adam(discriminator.parameters(), lr=2e-4, betas=(0.5, 0.999))
    criterion = nn.BCELoss()
    latent_dim = 100

    for epoch in range(n_epochs):
        for real_imgs in dataloader:
            batch_size = real_imgs.size(0)

            # === Train Discriminator ===
            d_optimizer.zero_grad()

            # Real images → label 1
            real_labels = torch.ones(batch_size)
            real_loss = criterion(discriminator(real_imgs), real_labels)

            # Fake images → label 0
            z = torch.randn(batch_size, latent_dim)
            fake_imgs = generator(z).detach()  # detach: don't backprop to G
            fake_labels = torch.zeros(batch_size)
            fake_loss = criterion(discriminator(fake_imgs), fake_labels)

            d_loss = real_loss + fake_loss
            d_loss.backward()
            d_optimizer.step()

            # === Train Generator ===
            g_optimizer.zero_grad()

            # Generator wants D to classify fakes as real (label 1)
            z = torch.randn(batch_size, latent_dim)
            fake_imgs = generator(z)
            g_loss = criterion(discriminator(fake_imgs), real_labels)

            g_loss.backward()
            g_optimizer.step()
```

## Mode Collapse and Training Instability

GANs suffer from two major problems:

**Mode collapse**: Generator produces only a few types of outputs (ignores most of the real distribution).

```
# Mode collapse example:
# Dataset has 10 digit classes (0-9)
# Generator only produces "1" and "7" (collapses to 2 modes)
# Discriminator can't distinguish these from real 1s and 7s
```

**Training instability**: The discriminator becomes too strong → vanishing gradients for generator. Or too weak → generator doesn't improve.

## Wasserstein GAN (WGAN)

WGAN (Arjovsky et al., 2017) fixes the gradient problem using the Wasserstein distance:

```python
# WGAN: no sigmoid on discriminator (now called "critic")
# Clip critic weights to enforce Lipschitz constraint
# Use -1/+1 labels, maximize for real, minimize for fake

def train_wgan(generator, critic, dataloader):
    # Critic update (5× per generator update)
    for _ in range(5):
        real_imgs = next(iter(dataloader))
        z = torch.randn(batch_size, latent_dim)
        fake_imgs = generator(z).detach()

        # WGAN loss: maximize E[critic(real)] - E[critic(fake)]
        critic_loss = -torch.mean(critic(real_imgs)) + torch.mean(critic(fake_imgs))
        critic_loss.backward()

        # Weight clipping (original WGAN)
        for p in critic.parameters():
            p.data.clamp_(-0.01, 0.01)

    # Generator update
    z = torch.randn(batch_size, latent_dim)
    g_loss = -torch.mean(critic(generator(z)))  # Minimize negative critic score
```

WGAN-GP improves further by using a **gradient penalty** instead of weight clipping.

## StyleGAN: High-Quality Faces

StyleGAN (Karras et al., 2019) introduced several innovations for photo-realistic image synthesis:

```python
# Key StyleGAN ideas:
# 1. Mapping network: z → w (intermediate latent, more disentangled)
# 2. Style injection via AdaIN at each layer
# 3. Noise injection for stochastic details (hair strands, pores)
# 4. Progressive growing: train at low res first, progressively add layers

class StyleGANGenerator:
    """Conceptual sketch of StyleGAN architecture."""
    def __init__(self):
        self.mapping_network = MappingNetwork(8)  # 8 FC layers: z → w
        self.synthesis_network = SynthesisNetwork()  # 18 layers, 4→1024 res

    def generate(self, z):
        w = self.mapping_network(z)      # Map to W space
        image = self.synthesis_network(w)  # Synthesize with style injection
        return image

# AdaIN (Adaptive Instance Normalization):
# Style injection mechanism
def adain(content, style_mean, style_std):
    normalized = (content - content.mean()) / content.std()
    return style_std * normalized + style_mean
```

## Why GANs Are Less Popular Now

Despite their quality, GANs fell out of favor for several reasons:

1. **Training instability**: require careful hyperparameter tuning
2. **Mode collapse**: can miss parts of the distribution
3. **Evaluation difficulty**: hard to tell if diversity is real or an artifact
4. **Diffusion models outperformed them** on quality metrics after 2021

GANs are still used as: discriminator losses in diffusion training, video frame discriminators, and for real-time applications (fast inference).

## Key Takeaways

- GANs frame generation as a two-player game: generator vs. discriminator
- Training is notoriously unstable due to mode collapse and gradient issues
- WGAN stabilizes training with the Wasserstein distance
- StyleGAN introduced mapping networks and style injection for high-quality image synthesis
- Diffusion models have largely replaced GANs for quality-focused generation tasks
