-- ==============================================================================
-- Routiq PostgreSQL + PostGIS Production Schema
-- ==============================================================================

-- Enable PostGIS extension if available
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email_or_phone VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'driver', -- 'driver' | 'owner_operator' | 'fleet_manager'
    subscription_tier VARCHAR(32) NOT NULL DEFAULT 'free', -- 'free' | 'pro' | 'fleet'
    company_name VARCHAR(255),
    language_preference VARCHAR(8) NOT NULL DEFAULT 'en', -- 'en' | 'hi'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email_phone ON users(email_or_phone);

-- 2. Vehicle Profiles Table
CREATE TABLE IF NOT EXISTS vehicles (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(32),
    category VARCHAR(32) NOT NULL, -- 'truck' | 'container' | 'tipper' | 'tanker' | 'trailer'
    height_meters NUMERIC(4, 2) NOT NULL,
    width_meters NUMERIC(4, 2) NOT NULL,
    length_meters NUMERIC(4, 2) NOT NULL,
    loaded_weight_tonnes NUMERIC(5, 2) NOT NULL,
    registered_gvw_tonnes NUMERIC(5, 2) NOT NULL,
    axle_count INTEGER NOT NULL DEFAULT 2,
    axle_load_tonnes NUMERIC(4, 2),
    fuel_type VARCHAR(64) DEFAULT 'Diesel',
    cargo_type VARCHAR(64) DEFAULT 'general', -- 'general' | 'hazmat' | 'perishable' | 'odc'
    source VARCHAR(64) DEFAULT 'MANUAL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_reg_no ON vehicles(registration_number);

-- 3. Saved Routes Table
CREATE TABLE IF NOT EXISTS saved_routes (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    origin_name VARCHAR(255) NOT NULL,
    origin_lon DOUBLE PRECISION NOT NULL,
    origin_lat DOUBLE PRECISION NOT NULL,
    destination_name VARCHAR(255) NOT NULL,
    destination_lon DOUBLE PRECISION NOT NULL,
    destination_lat DOUBLE PRECISION NOT NULL,
    vehicle_id VARCHAR(64) REFERENCES vehicles(id) ON DELETE SET NULL,
    distance_km NUMERIC(7, 2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    status VARCHAR(32) NOT NULL, -- 'RECOMMENDED' | 'WARNING' | 'BLOCKED'
    geometry_geojson JSONB NOT NULL,
    restrictions_summary JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_saved_routes_user_id ON saved_routes(user_id);

-- 4. Commercial Road Restrictions (Spatial Knowledge Base)
CREATE TABLE IF NOT EXISTS road_restrictions (
    id VARCHAR(64) PRIMARY KEY,
    type VARCHAR(32) NOT NULL, -- 'height' | 'weight' | 'axle' | 'time' | 'width'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    limit_value NUMERIC(6, 2),
    unit VARCHAR(16),
    lon DOUBLE PRECISION NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    highway_name VARCHAR(128),
    time_window_start VARCHAR(8),
    time_window_end VARCHAR(8),
    state VARCHAR(64),
    confidence VARCHAR(32) DEFAULT 'VERIFIED_OFFICIAL', -- 'VERIFIED_OFFICIAL' | 'COMMUNITY_REPORT' | 'HISTORICAL'
    source VARCHAR(64) DEFAULT 'MORTH_NHAI',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_restrictions_type ON road_restrictions(type);
CREATE INDEX IF NOT EXISTS idx_restrictions_coords ON road_restrictions(lon, lat);
