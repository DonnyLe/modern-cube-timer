# Session graphs

The first two views share the Session trend area: solve times and rolling ao12.
Use Graph type to switch, and Older/Newer solves to browse a session in windows
of up to 50 solves. The latest window appears initially. Changing sessions resets
the view. New solves advance the latest window.

Both axes use chronological solve numbers and seconds. Solve times include +2.
Rolling ao12 uses the existing `average` calculation: twelve consecutive solves,
trim the fastest and slowest, then average the remaining ten. One DNF is trimmed;
two or more make the average DNF. The first eleven solves have no average and
leave a gap. Windows include earlier solves when calculating their first ao12.
DNFs display × and break the line; missing averages leave gaps. Neither becomes
zero. Hover or tap the graph to read a solve number and formatted value. Keyboard
users focus the chart and use the left/right arrow keys to move between solves.

`Graph` is the reusable presentation component, built with Recharts. Recharts
owns responsive sizing, scales, ticks, paths, tooltips, and keyboard navigation. Pass ordered numeric x values,
y values in the caller's units, accessible point labels, axis labels, and an
optional tick formatter. `null` is missing data; Infinity is an invalid result.
The caller owns statistics, data selection, navigation, and empty states.

Distributions, additional averages, zooming, and overlays remain future proposals.
