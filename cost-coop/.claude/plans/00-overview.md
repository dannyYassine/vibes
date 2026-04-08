# CostCoop - Project Overview

## Vision

CostCoop is a peer-to-peer mobile platform that enables users to order Costco food court items through a cooperative delivery model. Unlike traditional food delivery apps, CostCoop connects **requesters** (customers at home who want food) with **runners** (Costco members already shopping at the store, or non-members who enter solely to fulfill orders).

## Core Concept

- **Requesters** browse the Costco food court menu, place orders, and pay through the app
- **Runners** see available orders via broadcast, accept them, purchase the food, and deliver it
- Non-Costco members can act as runners — they enter the store only to pick up and deliver orders
- No Costco membership is required to be a requester

## App Name & Branding

- **Name**: CostCoop (Costco + Cooperative)
- **Tagline**: TBD
- **Design aesthetic**: Clean, minimal — inspired by Apple/Stripe design language

## Target Platforms

- iOS (iPhone)
- Android

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native + TypeScript + Expo |
| Navigation | React Navigation (tab + stack) |
| State Management | Zustand |
| HTTP Client | Axios |
| Backend API | Rust + Axum (REST API) |
| Database | PostgreSQL (local dev) / Supabase (production) |
| Auth | Email/password + Google OAuth + Apple Sign-In (via Supabase Auth) |
| Hosting | Sevalla (Rust API) + Supabase (DB, Auth, Storage) |
| Payments | TBD (Stripe Connect likely) |

## User Roles

| Role | Description |
|------|-------------|
| **Requester** | Customer at home who orders food and pays through the app |
| **Runner** | Person at/near Costco who accepts orders, purchases food, and delivers it |

A single user can be both a requester and a runner (role switching within the app).

## Delivery Model

- **Broadcast matching**: Orders are broadcast to all available runners near the selected Costco location
- **First-accept wins**: The first runner to accept the order gets it
- **Fee structure**: Fixed service fee per order + optional tip from requester to runner
- **Payment**: In-app payment — requester pays, runner is reimbursed for food cost + earns fee/tip

## Menu Scope

- Standard Costco food court items (hot dogs, pizza, chicken bake, smoothies, etc.)
- Regional and seasonal specials that vary by location

## Geographic Scope

- Designed to work with any Costco location globally from day one
- No geographic restrictions — store selector is manual

## Timeline

- **MVP target**: 3-6 months
- **Approach**: MVP first (core ordering flow), then iterate with additional features

## Realtime Strategy

- Phase 1: Push notifications for order updates + polling for status checks
- Future: WebSocket-based live tracking
