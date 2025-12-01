-- Add opportunity_type column to opportunities table
ALTER TABLE opportunities 
ADD COLUMN opportunity_type text DEFAULT 'equipment';

COMMENT ON COLUMN opportunities.opportunity_type IS 'Type of opportunity: equipment (drone sales) or service (technical assistance)';