export interface MsEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  organizer?: { emailAddress: { name: string; address: string } };
  onlineMeeting?: { joinUrl: string };
  webLink: string;
}

/** Parse a Graph API dateTime string (which may lack a "Z" UTC suffix) as UTC. */
export function parseUTC(dateTimeStr: string): Date {
  if (!dateTimeStr.endsWith('Z') && !dateTimeStr.includes('+')) {
    return new Date(dateTimeStr + 'Z');
  }
  return new Date(dateTimeStr);
}

export async function getUpcomingMeetings(accessToken: string): Promise<MsEvent[]> {
  const now = new Date().toISOString();
  const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${now}&endDateTime=${end}&$orderby=start/dateTime&$top=50&$select=id,subject,start,end,location,organizer,onlineMeeting,webLink`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) throw new Error("Graph API error");
  const data = await res.json();
  return data.value;
}
