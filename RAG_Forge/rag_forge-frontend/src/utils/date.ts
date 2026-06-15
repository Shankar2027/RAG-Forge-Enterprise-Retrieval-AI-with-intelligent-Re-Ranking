import { format } from 'date-fns'

export const formatLocalTime = (
  dateString: string | null | undefined, 
  dateFormat: string = 'MMM d, yyyy · h:mm a'
) => {
  if (!dateString) return '—';
  
  // Force browser to recognize UTC by appending 'Z' if it's missing
  const safeDateString = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
  
  try {
    return format(new Date(safeDateString), dateFormat);
  } catch (error) {
    return 'Invalid Date';
  }
}