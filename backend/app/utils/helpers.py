"""
Helper utilities for the chores application.
"""
from datetime import date, datetime, timedelta
from typing import Optional


def get_week_start(target_date: Optional[date] = None) -> date:
    """
    Get the start of the week (Monday) for a given date.

    Args:
        target_date: The date to find the week start for. Defaults to today.

    Returns:
        The Monday of the week containing target_date.
    """
    if target_date is None:
        target_date = date.today()

    # Get the weekday (0 = Monday, 6 = Sunday)
    weekday = target_date.weekday()

    # Subtract the weekday to get to Monday
    return target_date - timedelta(days=weekday)


def get_week_end(target_date: Optional[date] = None) -> date:
    """
    Get the end of the week (Sunday) for a given date.

    Args:
        target_date: The date to find the week end for. Defaults to today.

    Returns:
        The Sunday of the week containing target_date.
    """
    week_start = get_week_start(target_date)
    return week_start + timedelta(days=6)


def get_week_range(target_date: Optional[date] = None) -> tuple[date, date]:
    """
    Get the start and end dates of a week.

    Args:
        target_date: The date to find the week range for. Defaults to today.

    Returns:
        A tuple of (week_start, week_end).
    """
    week_start = get_week_start(target_date)
    week_end = week_start + timedelta(days=6)
    return week_start, week_end


def get_current_week_start() -> date:
    """
    Get the start of the current week (Monday).

    Returns:
        The Monday of the current week.
    """
    return get_week_start(date.today())


def is_same_week(date1: date, date2: date) -> bool:
    """
    Check if two dates are in the same week.

    Args:
        date1: First date to compare.
        date2: Second date to compare.

    Returns:
        True if both dates are in the same week, False otherwise.
    """
    return get_week_start(date1) == get_week_start(date2)


def format_date_range(start_date: date, end_date: date) -> str:
    """
    Format a date range as a human-readable string.

    Args:
        start_date: Start of the range.
        end_date: End of the range.

    Returns:
        Formatted string like "Jan 15 - Jan 21, 2026".
    """
    if start_date.year == end_date.year:
        if start_date.month == end_date.month:
            return f"{start_date.strftime('%b %d')} - {end_date.strftime('%d, %Y')}"
        else:
            return f"{start_date.strftime('%b %d')} - {end_date.strftime('%b %d, %Y')}"
    else:
        return f"{start_date.strftime('%b %d, %Y')} - {end_date.strftime('%b %d, %Y')}"


def get_weekday_name(day_of_week: int) -> str:
    """
    Get the name of a weekday from its number.

    Args:
        day_of_week: Day number (0=Monday, 6=Sunday).

    Returns:
        The name of the weekday.

    Raises:
        ValueError: If day_of_week is not in range 0-6.
    """
    weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    if not 0 <= day_of_week <= 6:
        raise ValueError(f"day_of_week must be between 0 and 6, got {day_of_week}")

    return weekdays[day_of_week]


def get_weekday_short_name(day_of_week: int) -> str:
    """
    Get the short name of a weekday from its number.

    Args:
        day_of_week: Day number (0=Monday, 6=Sunday).

    Returns:
        The short name of the weekday.

    Raises:
        ValueError: If day_of_week is not in range 0-6.
    """
    weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    if not 0 <= day_of_week <= 6:
        raise ValueError(f"day_of_week must be between 0 and 6, got {day_of_week}")

    return weekdays[day_of_week]
