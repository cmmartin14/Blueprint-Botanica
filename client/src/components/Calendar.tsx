'use client';

import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction'; // needed for dateClick

export default function Calendar() {
  const handleDateClick = (arg: { dateStr: string; }) => {
    alert(`Date clicked: ${arg.dateStr}`);
  };

  return (
    <div className="calendar-container">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        dateClick={handleDateClick}
        events={[
          { title: 'Event 1', date: '2025-01-01' },
          { title: 'Event 2', date: '2025-01-02' },
        ]}
        height="auto"
      />
      <style jsx global>{`
        .calendar-container :global(.fc) {
          font-family: inherit;
        }
        .fc-daygrid-day-number {
          color: #028000
        }
        .fc .fc-toolbar.fc-header-toolbar {
          background-color: #028000 !important;
          color: white !important;
          padding: 10px;
          border-radius: 6px;
        }

        .fc .fc-toolbar-title {
          color: white !important;
          font-weight: bold;
        }
  
        .fc .fc-button {
          background: white !important;
          color: #166534 !important; 
          border: none !important;
        }

        .fc .fc-button:hover {
          background: #d1fae5 !important; 
        }
          
        .fc .fc-col-header-cell-cushion {
          color: #047857 !important;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}
