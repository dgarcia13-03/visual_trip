import express from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { createHash, randomUUID, randomBytes } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

app.use(express.json({ limit: '5mb' }));
app.use(express.static(join(__dirname, 'public')));

// ── Data helpers ──────────────────────────────────────────────────────────────

const dataDir = join(__dirname, 'data');

function readData(file) {
  return JSON.parse(readFileSync(join(dataDir, file), 'utf8'));
}

function writeData(file, data) {
  writeFileSync(join(dataDir, file), JSON.stringify(data, null, 2), 'utf8');
}

function hashPassword(plain) {
  return createHash('sha256').update(plain).digest('hex');
}

// ── Session store ─────────────────────────────────────────────────────────────

const sessions = new Map(); // token → { userId, role }

function createSession(userId, role) {
  const token = randomBytes(32).toString('hex');
  sessions.set(token, { userId, role });
  return token;
}

function getSession(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return sessions.get(auth.slice(7)) || null;
}

function requireRole(...roles) {
  return (req, res, next) => {
    const session = getSession(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (roles.length && !roles.includes(session.role))
      return res.status(403).json({ error: 'Forbidden' });
    req.session = session;
    next();
  };
}

// ── Seed ──────────────────────────────────────────────────────────────────────

function seed() {
  if (!existsSync(dataDir)) mkdirSync(dataDir);
  if (existsSync(join(dataDir, 'users.json'))) return;

  const adminId = randomUUID();
  const teacher1Id = randomUUID();
  const teacher2Id = randomUUID();
  const company1Id = randomUUID();
  const company2Id = randomUUID();
  const busUser1Id = randomUUID();
  const busUser2Id = randomUUID();
  const class1Id = randomUUID();
  const class2Id = randomUUID();

  // 10 students (5 per class) with parent users
  const makeStudent = (name, parentEmail) => ({
    studentId: randomUUID(),
    parentId: randomUUID(),
    name,
    parentEmail,
  });

  const class1Students = [
    makeStudent('Alice Johnson', 'parent.alice@example.com'),
    makeStudent('Bob Martinez', 'parent.bob@example.com'),
    makeStudent('Clara Lee', 'parent.clara@example.com'),
    makeStudent('David Kim', 'parent.david@example.com'),
    makeStudent('Eva Patel', 'parent.eva@example.com'),
  ];
  const class2Students = [
    makeStudent('Frank Torres', 'parent.frank@example.com'),
    makeStudent('Grace Wang', 'parent.grace@example.com'),
    makeStudent('Henry Nguyen', 'parent.henry@example.com'),
    makeStudent('Isla Brown', 'parent.isla@example.com'),
    makeStudent('Jake Wilson', 'parent.jake@example.com'),
  ];

  const now = new Date().toISOString();

  const users = [
    {
      id: adminId,
      name: 'Admin User',
      email: 'admin@school.edu',
      passwordHash: hashPassword('admin123'),
      role: 'admin',
      companyId: null,
      studentIds: [],
      createdAt: now,
    },
    {
      id: teacher1Id,
      name: 'Ms. Rivera',
      email: 'teacher1@school.edu',
      passwordHash: hashPassword('teacher123'),
      role: 'teacher',
      companyId: null,
      studentIds: [],
      createdAt: now,
    },
    {
      id: teacher2Id,
      name: 'Mr. Thompson',
      email: 'teacher2@school.edu',
      passwordHash: hashPassword('teacher123'),
      role: 'teacher',
      companyId: null,
      studentIds: [],
      createdAt: now,
    },
    {
      id: busUser1Id,
      name: 'City Bus Co.',
      email: 'bus1@citybusco.com',
      passwordHash: hashPassword('bus123'),
      role: 'bus_company',
      companyId: company1Id,
      studentIds: [],
      createdAt: now,
    },
    {
      id: busUser2Id,
      name: 'Valley Transit',
      email: 'bus2@valleytransit.com',
      passwordHash: hashPassword('bus123'),
      role: 'bus_company',
      companyId: company2Id,
      studentIds: [],
      createdAt: now,
    },
    ...[...class1Students, ...class2Students].map((s) => ({
      id: s.parentId,
      name: `Parent of ${s.name}`,
      email: s.parentEmail,
      passwordHash: hashPassword('parent123'),
      role: 'parent',
      companyId: null,
      studentIds: [s.studentId],
      createdAt: now,
    })),
  ];

  const companies = [
    {
      id: company1Id,
      name: 'City Bus Co.',
      contactEmail: 'bus1@citybusco.com',
      phone: '555-0101',
      userId: busUser1Id,
      preApproved: true,
      addedByAdminId: adminId,
      createdAt: now,
    },
    {
      id: company2Id,
      name: 'Valley Transit',
      contactEmail: 'bus2@valleytransit.com',
      phone: '555-0202',
      userId: busUser2Id,
      preApproved: true,
      addedByAdminId: adminId,
      createdAt: now,
    },
  ];

  const rosters = [
    {
      id: class1Id,
      className: '3rd Grade — Room 101',
      gradeLevel: '3rd',
      teacherId: teacher1Id,
      students: class1Students.map((s) => ({
        id: s.studentId,
        name: s.name,
        parentEmail: s.parentEmail,
      })),
    },
    {
      id: class2Id,
      className: '4th Grade — Room 205',
      gradeLevel: '4th',
      teacherId: teacher2Id,
      students: class2Students.map((s) => ({
        id: s.studentId,
        name: s.name,
        parentEmail: s.parentEmail,
      })),
    },
  ];

  const sampleTripId = randomUUID();
  const tripDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const returnTime = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString();

  const trips = [
    {
      id: sampleTripId,
      title: 'Science Museum Visit',
      destination: 'California Science Center, Los Angeles, CA',
      date: tripDate,
      returnTime,
      teacherId: teacher1Id,
      classId: class1Id,
      students: class1Students.map((s) => s.studentId),
      status: 'pending',
      adminNotes: '',
      checklist: [
        { item: 'Get admin approval', completed: false, custom: false },
        { item: 'Confirm bus booking', completed: false, custom: false },
        { item: 'Send permission forms to parents', completed: false, custom: false },
        { item: 'Collect all signed forms', completed: false, custom: false },
        { item: 'Confirm chaperones', completed: false, custom: false },
        { item: 'Arrange lunch / food plan', completed: false, custom: false },
      ],
      selectedQuoteId: null,
      routeSuggestion: {
        mapUrl: 'https://maps.google.com/?q=California+Science+Center,+Los+Angeles,+CA',
        distanceMiles: 12,
        estimatedBuses: Math.ceil(5 / 40),
      },
      createdAt: now,
    },
  ];

  writeData('users.json', users);
  writeData('trips.json', trips);
  writeData('rosters.json', rosters);
  writeData('companies.json', companies);
  writeData('permissions.json', []);

  console.log('✓ Seed data written to ./data/');
  console.log('  admin@school.edu / admin123');
  console.log('  teacher1@school.edu / teacher123');
  console.log('  teacher2@school.edu / teacher123');
  console.log('  bus1@citybusco.com / bus123');
  console.log('  bus2@valleytransit.com / bus123');
  console.log('  parent.alice@example.com / parent123  (etc.)');
}

// ── Page routes ───────────────────────────────────────────────────────────────

const page = (file) => (_req, res) =>
  res.sendFile(join(__dirname, 'public', file));

app.get('/', (_req, res) => res.redirect('/login'));
app.get('/login', page('login.html'));
app.get('/dashboard', page('dashboard.html'));
app.get('/trips/new', page('trips/new.html'));
app.get('/trips/:id', page('trips/detail.html'));
app.get('/trips/:id/permission', page('trips/permission.html'));
app.get('/admin/rosters', page('admin/rosters.html'));
app.get('/admin/companies', page('admin/companies.html'));
app.get('/signup', page('signup.html'));

// ── Auth API ──────────────────────────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const users = readData('users.json');
    const user = users.find(
      (u) => u.email === email && u.passwordHash === hashPassword(password)
    );
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const token = createSession(user.id, user.role);
    res.json({ data: { token, role: user.role, userId: user.id, name: user.name } });
  } catch {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) sessions.delete(auth.slice(7));
  res.json({ data: { ok: true } });
});

app.post('/api/auth/signup', (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ error: 'All fields are required' });
    if (!['teacher', 'parent'].includes(role))
      return res.status(400).json({ error: 'Role must be teacher or parent' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const users = readData('users.json');
    if (users.find((u) => u.email === email))
      return res.status(409).json({ error: 'An account with this email already exists' });

    // Auto-link parent to any students in rosters whose parentEmail matches
    let studentIds = [];
    if (role === 'parent') {
      const rosters = readData('rosters.json');
      rosters.forEach((r) => {
        r.students.forEach((s) => {
          if (s.parentEmail === email) studentIds.push(s.id);
        });
      });
    }

    const user = {
      id: randomUUID(),
      name,
      email,
      passwordHash: hashPassword(password),
      role,
      companyId: null,
      studentIds,
      createdAt: new Date().toISOString(),
    };

    users.push(user);
    writeData('users.json', users);

    const token = createSession(user.id, user.role);
    res.status(201).json({ data: { token, role: user.role, userId: user.id, name: user.name } });
  } catch {
    res.status(500).json({ error: 'Signup failed' });
  }
});

// ── Trips API ─────────────────────────────────────────────────────────────────

app.get('/api/trips', requireRole(), (req, res) => {
  try {
    const { userId, role } = req.session;
    let trips = readData('trips.json');
    if (role === 'teacher') trips = trips.filter((t) => t.teacherId === userId);
    else if (role === 'bus_company') trips = trips.filter((t) => ['approved_1', 'quoted'].includes(t.status));
    else if (role === 'parent') {
      const users = readData('users.json');
      const user = users.find((u) => u.id === userId);
      trips = trips.filter((t) =>
        t.students.some((sid) => user.studentIds.includes(sid))
      );
    }
    res.json({ data: trips });
  } catch {
    res.status(500).json({ error: 'Failed to load trips' });
  }
});

app.post('/api/trips', requireRole('teacher'), (req, res) => {
  try {
    const { title, destination, date, returnTime, classId, notes } = req.body;
    if (!title || !destination || !date || !returnTime || !classId)
      return res.status(400).json({ error: 'Missing required fields' });

    const rosters = readData('rosters.json');
    const cls = rosters.find((r) => r.id === classId);
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    const studentCount = cls.students.length;
    const busCapacity = 40;
    const encodedDest = encodeURIComponent(destination);
    const estimatedMiles = Math.floor(Math.random() * 20) + 5;

    const trip = {
      id: randomUUID(),
      title,
      destination,
      date,
      returnTime,
      teacherId: req.session.userId,
      classId,
      students: cls.students.map((s) => s.id),
      status: 'pending',
      adminNotes: notes || '',
      checklist: [
        { item: 'Get admin approval', completed: false, custom: false },
        { item: 'Confirm bus booking', completed: false, custom: false },
        { item: 'Send permission forms to parents', completed: false, custom: false },
        { item: 'Collect all signed forms', completed: false, custom: false },
        { item: 'Confirm chaperones', completed: false, custom: false },
        { item: 'Arrange lunch / food plan', completed: false, custom: false },
      ],
      selectedQuoteId: null,
      routeSuggestion: {
        mapUrl: `https://maps.google.com/?q=${encodedDest}`,
        distanceMiles: estimatedMiles,
        estimatedBuses: Math.ceil(studentCount / busCapacity),
      },
      createdAt: new Date().toISOString(),
    };

    const trips = readData('trips.json');
    trips.push(trip);
    writeData('trips.json', trips);
    res.status(201).json({ data: trip });
  } catch {
    res.status(500).json({ error: 'Failed to create trip' });
  }
});

app.get('/api/trips/:id', requireRole(), (req, res) => {
  try {
    const trips = readData('trips.json');
    const trip = trips.find((t) => t.id === req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    res.json({ data: trip });
  } catch {
    res.status(500).json({ error: 'Failed to load trip' });
  }
});

app.patch('/api/trips/:id/approve-1', requireRole('admin'), (req, res) => {
  try {
    const trips = readData('trips.json');
    const idx = trips.findIndex((t) => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Trip not found' });
    if (trips[idx].status !== 'pending')
      return res.status(400).json({ error: 'Trip is not in pending status' });

    trips[idx].status = 'approved_1';
    writeData('trips.json', trips);

    const companies = readData('companies.json');
    companies.forEach((c) => {
      console.log(
        `[EMAIL SIMULATION] To: ${c.contactEmail} | Subject: Quote Request for "${trips[idx].title}" | Please submit your quote at http://localhost:${PORT}/trips/${trips[idx].id}`
      );
    });

    res.json({ data: trips[idx] });
  } catch {
    res.status(500).json({ error: 'Failed to approve trip' });
  }
});

app.patch('/api/trips/:id/reject', requireRole('admin'), (req, res) => {
  try {
    const { notes } = req.body;
    const trips = readData('trips.json');
    const idx = trips.findIndex((t) => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Trip not found' });

    trips[idx].status = 'rejected';
    trips[idx].adminNotes = notes || '';
    writeData('trips.json', trips);

    const users = readData('users.json');
    const teacher = users.find((u) => u.id === trips[idx].teacherId);
    if (teacher) {
      console.log(
        `[EMAIL SIMULATION] To: ${teacher.email} | Subject: Trip "${trips[idx].title}" Rejected | Notes: ${notes || 'No notes provided'}`
      );
    }

    res.json({ data: trips[idx] });
  } catch {
    res.status(500).json({ error: 'Failed to reject trip' });
  }
});

app.patch('/api/trips/:id/approve-2', requireRole('admin'), (req, res) => {
  try {
    const { quoteId } = req.body;
    if (!quoteId) return res.status(400).json({ error: 'quoteId is required' });

    const trips = readData('trips.json');
    const idx = trips.findIndex((t) => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Trip not found' });
    if (!['approved_1', 'quoted'].includes(trips[idx].status))
      return res.status(400).json({ error: 'Trip cannot be approved at this stage' });

    trips[idx].status = 'approved_2';
    trips[idx].selectedQuoteId = quoteId;
    writeData('trips.json', trips);

    const rosters = readData('rosters.json');
    const cls = rosters.find((r) => r.id === trips[idx].classId);
    if (cls) {
      cls.students.forEach((s) => {
        console.log(
          `[EMAIL SIMULATION] To: ${s.parentEmail} | Subject: Permission Form for "${trips[idx].title}" | Sign at http://localhost:${PORT}/trips/${trips[idx].id}/permission`
        );
      });
    }

    res.json({ data: trips[idx] });
  } catch {
    res.status(500).json({ error: 'Failed to complete approval' });
  }
});

app.patch('/api/trips/:id/checklist', requireRole('teacher'), (req, res) => {
  try {
    const { checklist } = req.body;
    if (!Array.isArray(checklist))
      return res.status(400).json({ error: 'checklist must be an array' });

    const trips = readData('trips.json');
    const idx = trips.findIndex((t) => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Trip not found' });
    if (trips[idx].teacherId !== req.session.userId)
      return res.status(403).json({ error: 'Forbidden' });

    trips[idx].checklist = checklist;
    writeData('trips.json', trips);
    res.json({ data: trips[idx] });
  } catch {
    res.status(500).json({ error: 'Failed to update checklist' });
  }
});

// ── Quotes API ────────────────────────────────────────────────────────────────

app.get('/api/trips/:id/quotes', requireRole(), (req, res) => {
  try {
    const trips = readData('trips.json');
    const trip = trips.find((t) => t.id === req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const allTrips = readData('trips.json');
    const quotesFile = existsSync(join(dataDir, 'quotes.json'))
      ? readData('quotes.json')
      : [];
    const quotes = quotesFile.filter((q) => q.tripId === req.params.id);
    res.json({ data: quotes });
  } catch {
    res.status(500).json({ error: 'Failed to load quotes' });
  }
});

app.post('/api/trips/:id/quotes', requireRole('bus_company'), (req, res) => {
  try {
    const { price, busCount, busCapacity, availability, notes } = req.body;
    if (price == null || !busCount || !busCapacity)
      return res.status(400).json({ error: 'price, busCount, busCapacity are required' });

    const trips = readData('trips.json');
    const trip = trips.find((t) => t.id === req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (!['approved_1', 'quoted'].includes(trip.status))
      return res.status(400).json({ error: 'Trip is not accepting quotes' });

    const users = readData('users.json');
    const user = users.find((u) => u.id === req.session.userId);

    const quotes = existsSync(join(dataDir, 'quotes.json'))
      ? readData('quotes.json')
      : [];

    const quote = {
      id: randomUUID(),
      tripId: req.params.id,
      companyId: user.companyId,
      price: Number(price),
      busCount: Number(busCount),
      busCapacity: Number(busCapacity),
      availability: Boolean(availability),
      notes: notes || '',
      submittedAt: new Date().toISOString(),
    };

    quotes.push(quote);
    writeData('quotes.json', quotes);

    const tripIdx = trips.findIndex((t) => t.id === req.params.id);
    if (trips[tripIdx].status === 'approved_1') {
      trips[tripIdx].status = 'quoted';
      writeData('trips.json', trips);
    }

    res.status(201).json({ data: quote });
  } catch {
    res.status(500).json({ error: 'Failed to submit quote' });
  }
});

// ── Rosters API ───────────────────────────────────────────────────────────────

app.get('/api/rosters', requireRole(), (req, res) => {
  try {
    const rosters = readData('rosters.json');
    res.json({ data: rosters });
  } catch {
    res.status(500).json({ error: 'Failed to load rosters' });
  }
});

app.get('/api/rosters/:classId', requireRole(), (req, res) => {
  try {
    const rosters = readData('rosters.json');
    const cls = rosters.find((r) => r.id === req.params.classId);
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    res.json({ data: cls });
  } catch {
    res.status(500).json({ error: 'Failed to load roster' });
  }
});

app.post('/api/rosters', requireRole('admin'), (req, res) => {
  try {
    const { className, gradeLevel, teacherId } = req.body;
    if (!className || !gradeLevel || !teacherId)
      return res.status(400).json({ error: 'className, gradeLevel, teacherId required' });

    const cls = {
      id: randomUUID(),
      className,
      gradeLevel,
      teacherId,
      students: [],
    };

    const rosters = readData('rosters.json');
    rosters.push(cls);
    writeData('rosters.json', rosters);
    res.status(201).json({ data: cls });
  } catch {
    res.status(500).json({ error: 'Failed to create class' });
  }
});

app.post('/api/rosters/:classId/students', requireRole('admin'), (req, res) => {
  try {
    const { name, parentEmail } = req.body;
    if (!name || !parentEmail)
      return res.status(400).json({ error: 'name and parentEmail required' });

    const rosters = readData('rosters.json');
    const idx = rosters.findIndex((r) => r.id === req.params.classId);
    if (idx === -1) return res.status(404).json({ error: 'Class not found' });

    const studentId = randomUUID();
    const student = { id: studentId, name, parentEmail };
    rosters[idx].students.push(student);
    writeData('rosters.json', rosters);

    // Create parent user if email not already registered
    const users = readData('users.json');
    const existing = users.find((u) => u.email === parentEmail);
    if (!existing) {
      const parentUser = {
        id: randomUUID(),
        name: `Parent of ${name}`,
        email: parentEmail,
        passwordHash: hashPassword('parent123'),
        role: 'parent',
        companyId: null,
        studentIds: [studentId],
        createdAt: new Date().toISOString(),
      };
      users.push(parentUser);
      writeData('users.json', users);
      console.log(
        `[EMAIL SIMULATION] To: ${parentEmail} | Subject: Your child ${name} has been added | Login with parent123`
      );
    } else {
      if (!existing.studentIds.includes(studentId)) {
        existing.studentIds.push(studentId);
        writeData('users.json', users);
      }
    }

    res.status(201).json({ data: student });
  } catch {
    res.status(500).json({ error: 'Failed to add student' });
  }
});

app.delete('/api/rosters/:classId/students/:studentId', requireRole('admin'), (req, res) => {
  try {
    const rosters = readData('rosters.json');
    const idx = rosters.findIndex((r) => r.id === req.params.classId);
    if (idx === -1) return res.status(404).json({ error: 'Class not found' });

    rosters[idx].students = rosters[idx].students.filter(
      (s) => s.id !== req.params.studentId
    );
    writeData('rosters.json', rosters);
    res.json({ data: { ok: true } });
  } catch {
    res.status(500).json({ error: 'Failed to remove student' });
  }
});

// ── Bus Companies API ─────────────────────────────────────────────────────────

app.get('/api/companies', requireRole(), (req, res) => {
  try {
    res.json({ data: readData('companies.json') });
  } catch {
    res.status(500).json({ error: 'Failed to load companies' });
  }
});

app.post('/api/companies', requireRole('admin'), (req, res) => {
  try {
    const { name, contactEmail, phone } = req.body;
    if (!name || !contactEmail)
      return res.status(400).json({ error: 'name and contactEmail required' });

    const newUserId = randomUUID();
    const companyId = randomUUID();

    const company = {
      id: companyId,
      name,
      contactEmail,
      phone: phone || '',
      userId: newUserId,
      preApproved: true,
      addedByAdminId: req.session.userId,
      createdAt: new Date().toISOString(),
    };

    const companies = readData('companies.json');
    companies.push(company);
    writeData('companies.json', companies);

    const users = readData('users.json');
    const busUser = {
      id: newUserId,
      name,
      email: contactEmail,
      passwordHash: hashPassword('bus123'),
      role: 'bus_company',
      companyId,
      studentIds: [],
      createdAt: new Date().toISOString(),
    };
    users.push(busUser);
    writeData('users.json', users);

    console.log(
      `[EMAIL SIMULATION] To: ${contactEmail} | Subject: You've been added to Visual Trip | Login at http://localhost:${PORT}/login with your email and password: bus123`
    );

    res.status(201).json({ data: company });
  } catch {
    res.status(500).json({ error: 'Failed to add company' });
  }
});

app.delete('/api/companies/:id', requireRole('admin'), (req, res) => {
  try {
    const companies = readData('companies.json');
    const filtered = companies.filter((c) => c.id !== req.params.id);
    if (filtered.length === companies.length)
      return res.status(404).json({ error: 'Company not found' });
    writeData('companies.json', filtered);
    res.json({ data: { ok: true } });
  } catch {
    res.status(500).json({ error: 'Failed to remove company' });
  }
});

// ── Permissions API ───────────────────────────────────────────────────────────

app.get('/api/trips/:id/permissions', requireRole(), (req, res) => {
  try {
    const permissions = readData('permissions.json');
    res.json({ data: permissions.filter((p) => p.tripId === req.params.id) });
  } catch {
    res.status(500).json({ error: 'Failed to load permissions' });
  }
});

app.post('/api/trips/:id/permissions', (req, res) => {
  try {
    const { studentId, parentName, parentEmail, signatureDataUrl, chaperoneOptIn } = req.body;
    if (!studentId || !parentName || !parentEmail || !signatureDataUrl)
      return res.status(400).json({ error: 'Missing required fields' });

    const trips = readData('trips.json');
    const trip = trips.find((t) => t.id === req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const permissions = readData('permissions.json');
    const existing = permissions.findIndex(
      (p) => p.tripId === req.params.id && p.studentId === studentId
    );

    const form = {
      id: existing >= 0 ? permissions[existing].id : randomUUID(),
      tripId: req.params.id,
      studentId,
      parentName,
      parentEmail,
      signatureDataUrl,
      chaperoneOptIn: Boolean(chaperoneOptIn),
      signedAt: new Date().toISOString(),
    };

    if (existing >= 0) permissions[existing] = form;
    else permissions.push(form);

    writeData('permissions.json', permissions);

    const allSigned = trip.students.every((sid) =>
      permissions.some((p) => p.tripId === req.params.id && p.studentId === sid)
    );
    if (allSigned && trip.status === 'approved_2') {
      const tidx = trips.findIndex((t) => t.id === req.params.id);
      trips[tidx].status = 'confirmed';
      writeData('trips.json', trips);
    }

    res.status(201).json({ data: form });
  } catch {
    res.status(500).json({ error: 'Failed to submit permission form' });
  }
});

app.get('/api/trips/:id/permissions/status', requireRole(), (req, res) => {
  try {
    const trips = readData('trips.json');
    const trip = trips.find((t) => t.id === req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const rosters = readData('rosters.json');
    const cls = rosters.find((r) => r.id === trip.classId);
    const permissions = readData('permissions.json').filter(
      (p) => p.tripId === req.params.id
    );

    const students = cls ? cls.students : [];
    const status = students.map((s) => {
      const form = permissions.find((p) => p.studentId === s.id);
      return {
        studentId: s.id,
        studentName: s.name,
        parentEmail: s.parentEmail,
        signed: !!form,
        chaperoneOptIn: form?.chaperoneOptIn || false,
        signedAt: form?.signedAt || null,
      };
    });

    res.json({
      data: {
        total: students.length,
        signed: status.filter((s) => s.signed).length,
        unsigned: status.filter((s) => !s.signed).length,
        students: status,
      },
    });
  } catch {
    res.status(500).json({ error: 'Failed to load permission status' });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

seed();
app.listen(PORT, () => {
  console.log(`Visual Trip running at http://localhost:${PORT}`);
});
