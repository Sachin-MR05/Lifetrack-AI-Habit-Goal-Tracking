-- Add recurring task columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN is_recurring boolean DEFAULT false,
ADD COLUMN recurrence_frequency text DEFAULT 'daily',
ADD COLUMN recurrence_end_date timestamp with time zone,
ADD COLUMN is_recurrence_active boolean DEFAULT true;

-- Create function to recreate recurring tasks
CREATE OR REPLACE FUNCTION public.recreate_recurring_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- If task is marked complete and is a recurring task
  IF NEW.status = 'completed' AND NEW.is_recurring = true AND NEW.is_recurrence_active = true THEN
    -- Check if recurrence should continue
    IF NEW.recurrence_end_date IS NULL OR NEW.recurrence_end_date > now() THEN
      -- Create a new instance of the task for the next day
      INSERT INTO public.tasks (
        user_id,
        folder_id,
        title,
        description,
        priority,
        due_date,
        status,
        is_recurring,
        recurrence_frequency,
        recurrence_end_date,
        is_recurrence_active
      ) VALUES (
        NEW.user_id,
        NEW.folder_id,
        NEW.title,
        NEW.description,
        NEW.priority,
        CASE 
          WHEN NEW.due_date IS NOT NULL THEN NEW.due_date + interval '1 day'
          ELSE NULL
        END,
        'pending',
        NEW.is_recurring,
        NEW.recurrence_frequency,
        NEW.recurrence_end_date,
        NEW.is_recurrence_active
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to recreate recurring tasks when completed
CREATE TRIGGER recreate_recurring_task_trigger
AFTER UPDATE ON public.tasks
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.recreate_recurring_task();