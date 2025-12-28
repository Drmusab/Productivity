-- Database initialization script for Productivity OS with Plane integration
-- This script creates the necessary databases for the system

-- Create databases
CREATE DATABASE IF NOT EXISTS plane;
CREATE DATABASE IF NOT EXISTS productivity_os;
CREATE DATABASE IF NOT EXISTS auth_bridge;

-- Grant privileges to the productivity user
GRANT ALL PRIVILEGES ON DATABASE plane TO productivity;
GRANT ALL PRIVILEGES ON DATABASE productivity_os TO productivity;
GRANT ALL PRIVILEGES ON DATABASE auth_bridge TO productivity;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Databases created successfully: plane, productivity_os, auth_bridge';
END
$$;
