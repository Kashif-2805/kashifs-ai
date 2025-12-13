import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2, Clock, MapPin } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, startOfWeek, endOfWeek } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color: string;
  location?: string;
}

const colorOptions = [
  { value: "primary", label: "Primary", class: "bg-primary" },
  { value: "blue", label: "Blue", class: "bg-blue-500" },
  { value: "green", label: "Green", class: "bg-green-500" },
  { value: "orange", label: "Orange", class: "bg-orange-500" },
  { value: "purple", label: "Purple", class: "bg-purple-500" },
  { value: "red", label: "Red", class: "bg-red-500" },
];

const getColorClass = (color: string) => {
  const found = colorOptions.find(c => c.value === color);
  return found?.class || "bg-primary";
};

const CalendarPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState("primary");
  const [location, setLocation] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user, currentMonth]);

  const fetchEvents = async () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('start_time', start.toISOString())
      .lte('start_time', end.toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error);
      return;
    }

    setEvents(data || []);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartTime("");
    setEndTime("");
    setAllDay(false);
    setColor("primary");
    setLocation("");
    setEditingEvent(null);
  };

  const handleOpenDialog = (date: Date, event?: CalendarEvent) => {
    setSelectedDate(date);
    
    if (event) {
      setEditingEvent(event);
      setTitle(event.title);
      setDescription(event.description || "");
      setStartTime(format(parseISO(event.start_time), "HH:mm"));
      setEndTime(format(parseISO(event.end_time), "HH:mm"));
      setAllDay(event.all_day);
      setColor(event.color);
      setLocation(event.location || "");
    } else {
      resetForm();
      setStartTime("09:00");
      setEndTime("10:00");
    }
    
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !selectedDate) {
      toast.error("Title is required");
      return;
    }

    const startDateTime = allDay 
      ? new Date(selectedDate.setHours(0, 0, 0, 0))
      : new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${startTime}`);
    
    const endDateTime = allDay
      ? new Date(selectedDate.setHours(23, 59, 59, 999))
      : new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${endTime}`);

    const eventData = {
      title: title.trim(),
      description: description.trim() || null,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      all_day: allDay,
      color,
      location: location.trim() || null,
      user_id: user?.id,
    };

    if (editingEvent) {
      const { error } = await supabase
        .from('calendar_events')
        .update(eventData)
        .eq('id', editingEvent.id);

      if (error) {
        toast.error("Failed to update event");
        return;
      }
      toast.success("Event updated");
    } else {
      const { error } = await supabase
        .from('calendar_events')
        .insert([eventData]);

      if (error) {
        toast.error("Failed to create event");
        return;
      }
      toast.success("Event created");
    }

    setIsDialogOpen(false);
    resetForm();
    fetchEvents();
  };

  const handleDelete = async (eventId: string) => {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId);

    if (error) {
      toast.error("Failed to delete event");
      return;
    }

    toast.success("Event deleted");
    setIsDialogOpen(false);
    fetchEvents();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (date: Date) => {
    return events.filter(event => isSameDay(parseISO(event.start_time), date));
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle className="text-xl md:text-2xl">
                {format(currentMonth, 'MMMM yyyy')}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentMonth(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  <span className="hidden md:inline">{day}</span>
                  <span className="md:hidden">{day.charAt(0)}</span>
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                const dayEvents = getEventsForDay(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentMonth);

                return (
                  <div
                    key={index}
                    onClick={() => handleOpenDialog(day)}
                    className={cn(
                      "min-h-[80px] md:min-h-[100px] p-1 md:p-2 border rounded-lg cursor-pointer transition-colors",
                      isCurrentMonth ? "bg-card hover:bg-muted/50" : "bg-muted/30 text-muted-foreground",
                      isToday && "ring-2 ring-primary"
                    )}
                  >
                    <div className={cn(
                      "text-xs md:text-sm font-medium mb-1",
                      isToday && "text-primary"
                    )}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map(event => (
                        <div
                          key={event.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDialog(day, event);
                          }}
                          className={cn(
                            "text-[10px] md:text-xs px-1 py-0.5 rounded truncate text-white",
                            getColorClass(event.color)
                          )}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-muted-foreground">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Event Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? "Edit Event" : "New Event"}
                {selectedDate && ` - ${format(selectedDate, 'MMM d, yyyy')}`}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Event title"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Event description"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Add location"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="all-day">All day</Label>
                <Switch
                  id="all-day"
                  checked={allDay}
                  onCheckedChange={setAllDay}
                />
              </div>

              {!allDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-time">Start time</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="start-time"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="end-time">End time</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="end-time"
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label>Color</Label>
                <Select value={color} onValueChange={setColor}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-3 h-3 rounded-full", option.class)} />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-between pt-4">
                {editingEvent && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(editingEvent.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit}>
                    {editingEvent ? "Update" : "Create"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default CalendarPage;
