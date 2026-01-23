-- Update recurring task logic and add trigger to ensure daily recurrence
-- 1) Replace function to set next due_date even when original due_date is NULL
CREATE OR REPLACE FUNCTION public.recreate_recurring_task()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If task is marked complete and is a recurring task and active
  IF NEW.status = 'completed' AND NEW.is_recurring = true AND NEW.is_recurrence_active = true THEN
    -- Continue recurrence if end date not set or in the future
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
        COALESCE(NEW.due_date + interval '1 day', date_trunc('day', now()) + interval '1 day'),
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

-- 2) Recreate trigger to call the function only when status changes to 'completed'
DROP TRIGGER IF EXISTS recreate_recurring_task_trigger ON public.tasks;
CREATE TRIGGER recreate_recurring_task_trigger
AFTER UPDATE OF status ON public.tasks
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed')
EXECUTE FUNCTION public.recreate_recurring_task();