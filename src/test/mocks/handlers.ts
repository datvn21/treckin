import { http, HttpResponse } from "msw";

const API_URL = "http://localhost:4000/api";

const mockUser = {
  id: "user-1",
  email: "attendee@example.com",
  name: "Nguyen Van A",
  role: "user" as const,
  avatarUrl: "",
  createdAt: "2025-01-01T00:00:00.000Z",
};

const mockEvent = {
  id: "event-1",
  title: "Workshop AI & Machine Learning",
  description: "Public event with event-level eligibility rules",
  date: "2025-06-15",
  startTime: "08:00",
  endTime: "12:00",
  location: "Main Hall",
  latitude: 10.7329,
  longitude: 106.6997,
  geofenceRadius: 500,
  status: "active" as const,
  boards: [
    {
      id: "board-1",
      name: "Gate A",
      eventId: "event-1",
      status: "active" as const,
      checkinCount: 42,
    },
    {
      id: "board-2",
      name: "Gate B",
      eventId: "event-1",
      status: "active" as const,
      checkinCount: 38,
    },
  ],
  totalCheckins: 80,
  totalRegistered: 200,
  createdBy: "admin-1",
  createdAt: "2025-06-01T00:00:00.000Z",
};

const mockCheckinRecord = {
  id: "checkin-1",
  userId: "user-1",
  userName: "Nguyen Van A",
  eventId: "event-1",
  boardId: "board-1",
  boardName: "Gate A",
  timestamp: new Date().toISOString(),
  method: "qr" as const,
};

export const handlers = [
  http.post(`${API_URL}/auth/google`, () => {
    return HttpResponse.json({
      user: mockUser,
      accessToken: "mock-access-token-jwt",
      refreshToken: "mock-refresh-token-jwt",
    });
  }),

  http.post(`${API_URL}/qr/generate`, () => {
    return HttpResponse.json({
      hash: "qr-hash-abc123def456",
      expiresAt: Date.now() + 30_000,
      ttl: 30,
      shortCode: "A3X7KP",
    });
  }),

  http.post(`${API_URL}/checkin/scan`, () => {
    return HttpResponse.json({
      status: "success",
      student: {
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        avatarUrl: mockUser.avatarUrl,
      },
      checkinRecord: mockCheckinRecord,
      message: "Check-in thành công!",
    });
  }),

  http.post(`${API_URL}/checkin/by-short-code`, () => {
    return HttpResponse.json({
      success: true,
      checkinRecord: {
        ...mockCheckinRecord,
        user: { id: mockUser.id, name: mockUser.name, email: mockUser.email },
      },
    });
  }),

  http.post(`${API_URL}/checkin/bulk-sync`, () => {
    return HttpResponse.json({
      synced: 3,
      skipped: 0,
      errors: [],
    });
  }),

  http.get(`${API_URL}/events`, () => {
    return HttpResponse.json([
      {
        id: mockEvent.id,
        title: mockEvent.title,
        date: mockEvent.date,
        startTime: mockEvent.startTime,
        location: mockEvent.location,
        status: mockEvent.status,
        totalCheckins: mockEvent.totalCheckins,
        totalRegistered: mockEvent.totalRegistered,
        boardCount: mockEvent.boards.length,
      },
    ]);
  }),

  http.get(`${API_URL}/events/:id`, ({ params }) => {
    if (params["id"] === mockEvent.id) {
      return HttpResponse.json(mockEvent);
    }

    return HttpResponse.json({ message: "Event not found" }, { status: 404 });
  }),
];

export { mockUser, mockEvent, mockCheckinRecord };
