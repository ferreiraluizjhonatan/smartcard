CREATE TABLE IF NOT EXISTS public.ajuste_pendencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  elevator_id uuid REFERENCES public.elevators(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  resolvida boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);