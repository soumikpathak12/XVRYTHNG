import React, { useMemo, useState } from 'react';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachWeekOfInterval,
  eachMonthOfInterval,
  format,
  differenceInDays,
  isBefore,
  startOfDay
} from 'date-fns';
import { useNavigate } from 'react-router-dom';
import './ProjectsTimeline.css';

export default function ProjectsTimeline({ projects = [] }) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('weeks'); // 'weeks' or 'months'

  // Pre-process dates
  const processedProjects = useMemo(() => {
    const today = startOfDay(new Date());

    return projects.map((p) => {
      // Parse created_at (fallback to a month ago if missing)
      const rawStart = p._raw?.created_at ? new Date(p._raw.created_at) : new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const start = Number.isNaN(rawStart.getTime()) ? today : startOfDay(rawStart);

      // Parse expected completion (fallback to updated_at + 14 days, or start + 30 days)
      let end, expectedDateObj;
      if (p._raw?.expected_completion_date) {
        expectedDateObj = new Date(p._raw.expected_completion_date);
        end = startOfDay(expectedDateObj);
      } else if (p.lastActivity) {
        end = startOfDay(new Date(new Date(p.lastActivity).getTime() + 14 * 24 * 60 * 60 * 1000));
      } else {
        end = startOfDay(new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000));
      }
      
      if (Number.isNaN(end.getTime())) end = startOfDay(new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000));
      
      // Ensure start <= end
      if (isBefore(end, start)) {
        end = start;
      }

      // Check overdue (only if expected_completion_date exists and we aren't done)
      let isOverdue = false;
      if (expectedDateObj && isBefore(expectedDateObj, today)) {
        if (p.stage !== 'project_completed' && p.stage !== 'done' && p.stage !== 'cancelled') {
          isOverdue = true;
        }
      }

      // Milestone date (latest activity)
      let milestoneDate = null;
      if (p.lastActivity) {
        const ma = startOfDay(new Date(p.lastActivity));
        if (!Number.isNaN(ma.getTime())) milestoneDate = ma;
      }

      return {
        ...p,
        projectStart: start,
        projectEnd: end,
        expectedDateOrig: expectedDateObj,
        isOverdue,
        milestoneDate
      };
    }).sort((a, b) => b.projectStart - a.projectStart); // newest first
  }, [projects]);

  // Determine global timeline boundaries
  const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
    if (processedProjects.length === 0) {
      const ts = startOfWeek(new Date(), { weekStartsOn: 1 });
      const te = endOfWeek(new Date(ts.getTime() + 30 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 });
      return { timelineStart: ts, timelineEnd: te, totalDays: differenceInDays(te, ts) + 1 };
    }

    let minDate = processedProjects[0].projectStart;
    let maxDate = processedProjects[0].projectEnd;

    for (const p of processedProjects) {
      if (isBefore(p.projectStart, minDate)) minDate = p.projectStart;
      if (!isBefore(p.projectEnd, maxDate)) maxDate = p.projectEnd;
    }

    // Add a little padding to the view
    let ts, te;
    if (viewMode === 'weeks') {
      ts = startOfWeek(minDate, { weekStartsOn: 1 });
      te = endOfWeek(new Date(maxDate.getTime() + 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 });
    } else {
      ts = startOfMonth(minDate);
      te = endOfMonth(new Date(maxDate.getTime() + 30 * 24 * 60 * 60 * 1000));
    }

    // Prevent extreme massive timelines breaking layout (cap at ~2 years)
    if (differenceInDays(te, ts) > 730) {
       te = new Date(ts.getTime() + 730 * 24 * 60 * 60 * 1000);
    }

    return {
      timelineStart: ts,
      timelineEnd: te,
      totalDays: Math.max(1, differenceInDays(te, ts) + 1)
    };
  }, [processedProjects, viewMode]);

  // Generate grid columns dates
  const columns = useMemo(() => {
    if (viewMode === 'weeks') {
      return eachWeekOfInterval(
        { start: timelineStart, end: timelineEnd },
        { weekStartsOn: 1 }
      );
    } else {
      return eachMonthOfInterval({ start: timelineStart, end: timelineEnd });
    }
  }, [timelineStart, timelineEnd, viewMode]);

  const getPositionPercentage = (date) => {
    if (!date) return 0;
    const diff = differenceInDays(date, timelineStart);
    let pct = (diff / totalDays) * 100;
    if (pct < 0) pct = 0;
    if (pct > 100) pct = 100;
    return pct;
  };


  return (
    <div className="projects-timeline-container">
      <div className="projects-timeline-controls">
        <label>Time Scale: </label>
        <div className="leads-view-tabs" style={{ display: 'inline-flex', marginLeft: 8 }}>
          <button
            className={`leads-view-tab ${viewMode === 'weeks' ? 'active' : ''}`}
            onClick={() => setViewMode('weeks')}
            style={{ padding: '4px 12px', fontSize: '0.85rem' }}
          >
            Weekly
          </button>
          <button
            className={`leads-view-tab ${viewMode === 'months' ? 'active' : ''}`}
            onClick={() => setViewMode('months')}
            style={{ padding: '4px 12px', fontSize: '0.85rem' }}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="projects-timeline-scroll-area">
        <div className="projects-timeline-grid">
          {/* Header Row */}
          <div className="projects-timeline-header-row">
            <div className="projects-timeline-label-col">Project</div>
            <div className="projects-timeline-chart-col">
              {columns.map((colDate, idx) => {
                const isLast = idx === columns.length - 1;
                const nextDate = isLast ? timelineEnd : columns[idx + 1];
                const widthPct = ((differenceInDays(nextDate, colDate)) / totalDays) * 100;
                return (
                  <div 
                    key={colDate.toISOString()} 
                    className="projects-timeline-header-cell"
                    style={{ left: `${getPositionPercentage(colDate)}%`, width: `${widthPct}%` }}
                  >
                    <span>{viewMode === 'weeks' ? format(colDate, 'MMM d') : format(colDate, 'MMM yyyy')}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Project Rows */}
          {processedProjects.map((p) => {
            const startPct = getPositionPercentage(p.projectStart);
            const endPct = getPositionPercentage(p.projectEnd);
            let widthPct = endPct - startPct;
            if (widthPct < 0.5) widthPct = 0.5; // min visibility

            // Milestone marker
            let milestonePct = null;
            if (p.milestoneDate && p.milestoneDate >= timelineStart && p.milestoneDate <= timelineEnd) {
              milestonePct = getPositionPercentage(p.milestoneDate);
            }

            const barColor = p.isOverdue ? '#ef4444' : '#1A7B7B';

            return (
              <div key={p.id} className={`projects-timeline-row ${p.isOverdue ? 'overdue' : ''}`}>
                <div 
                  className="projects-timeline-label-col" 
                  onClick={() => navigate(`/admin/projects/${p.id}`)}
                >
                  <div className="pt-name" title={p.customerName}>{p.customerName}</div>
                  <div className="pt-stage">{p.stage.replace(/_/g, ' ')}</div>
                </div>
                
                <div className="projects-timeline-chart-col">
                  {/* Grid Lines */}
                  {columns.map((colDate) => (
                    <div 
                      key={colDate.toISOString()} 
                      className="pt-grid-line"
                      style={{ left: `${getPositionPercentage(colDate)}%` }}
                    />
                  ))}

                  {/* The Bar */}
                  <div 
                    className="pt-bar-wrapper"
                    style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                    title={`Start: ${format(p.projectStart, 'PP')}\nEnd: ${format(p.projectEnd, 'PP')}${p.isOverdue ? ' (OVERDUE)' : ''}`}
                  >
                    <div className="pt-bar" style={{ backgroundColor: barColor }}>
                       <span className="pt-bar-label">{p.isOverdue ? 'Overdue' : ''}</span>
                    </div>
                  </div>

                  {/* Milestone Marker */}
                  {milestonePct !== null && (
                    <div 
                      className="pt-milestone"
                      style={{ left: `${milestonePct}%` }}
                      title={`Last Updated: ${format(p.milestoneDate, 'PP')}`}
                    >
                      <div className="pt-milestone-diamond" />
                    </div>
                  )}

                  {/* Today line */}
                  <div 
                    className="pt-today-line" 
                    style={{ left: `${getPositionPercentage(new Date())}%` }}
                    title="Today"
                  />
                </div>
              </div>
            );
          })}
          
          {processedProjects.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>
              No projects to display on timeline.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
