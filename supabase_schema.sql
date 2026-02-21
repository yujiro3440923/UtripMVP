-- Utrip Database Schema
-- Run this script in the Supabase SQL Editor

-- --------------------------------------------------------
-- 1. Create Tables
-- --------------------------------------------------------

-- users table
CREATE TABLE public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- trips table
CREATE TABLE public.trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'analyzed')),
  planned_spots JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- data_points table (GPS and Mood data)
CREATE TABLE public.data_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 5),
  energy_score INTEGER CHECK (energy_score BETWEEN 1 AND 5),
  experience_tags TEXT[],
  companion TEXT CHECK (companion IN ('solo', 'small_group', 'large_group')),
  note TEXT,
  point_type TEXT DEFAULT 'auto',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- detected_spots table
CREATE TABLE public.detected_spots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  place_name TEXT,
  arrival_time TIMESTAMPTZ NOT NULL,
  departure_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  mood_before INTEGER,
  mood_after INTEGER,
  calibration_label TEXT CHECK (calibration_label IN ('immersion', 'recovery', 'filler', 'external')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- trip_analyses table
CREATE TABLE public.trip_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  immersion_triggers JSONB,
  exploration_score NUMERIC,
  rhythm_pattern JSONB,
  uncertainty_tolerance NUMERIC,
  social_energy NUMERIC,
  decision_style TEXT CHECK (decision_style IN ('planned', 'spontaneous', 'balanced')),
  raw_stats JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- personal_profiles table
CREATE TABLE public.personal_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  version INTEGER DEFAULT 1,
  profile_data JSONB NOT NULL,
  trips_analyzed INTEGER DEFAULT 0,
  llm_prompt_context TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- calibrations table
CREATE TABLE public.calibrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  spot_id UUID REFERENCES public.detected_spots(id) ON DELETE CASCADE NOT NULL UNIQUE,
  question TEXT NOT NULL,
  answer TEXT,
  label TEXT CHECK (label IN ('immersion', 'recovery', 'filler', 'external')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- --------------------------------------------------------
-- 2. Enable Row Level Security (RLS)
-- --------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detected_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibrations ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------
-- 3. Create RLS Policies
-- --------------------------------------------------------

-- users
CREATE POLICY "Users can access own data" ON public.users FOR ALL USING (auth.uid() = id);

-- trips
CREATE POLICY "Users can access own trips" ON public.trips FOR ALL USING (auth.uid() = user_id);

-- data_points
CREATE POLICY "Users can access own data points" ON public.data_points FOR ALL USING (auth.uid() = user_id);

-- detected_spots
-- (detected_spots doesn't have a user_id directly, so we check through the trips table)
CREATE POLICY "Users can access own detected spots" ON public.detected_spots FOR ALL USING (
  EXISTS (SELECT 1 FROM public.trips WHERE trips.id = detected_spots.trip_id AND trips.user_id = auth.uid())
);

-- trip_analyses
CREATE POLICY "Users can access own trip analyses" ON public.trip_analyses FOR ALL USING (auth.uid() = user_id);

-- personal_profiles
CREATE POLICY "Users can access own personal profiles" ON public.personal_profiles FOR ALL USING (auth.uid() = user_id);

-- calibrations
CREATE POLICY "Users can access own calibrations" ON public.calibrations FOR ALL USING (auth.uid() = user_id);

-- --------------------------------------------------------
-- 4. Create Triggers (Optional: Auto-create user on signup)
-- --------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
