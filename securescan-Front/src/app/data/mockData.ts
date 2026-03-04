export interface Vulnerability {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  owaspCategory: string;
  file: string;
  line: number;
  tool: string;
  title: string;
  description: string;
  codeSnippet: string;
  fixedCode: string;
  fixExplanation: string;
}

export const mockVulnerabilities: Vulnerability[] = [
  {
    id: "1",
    severity: "critical",
    owaspCategory: "A03:2021 - Injection",
    file: "src/api/users.js",
    line: 42,
    tool: "Semgrep",
    title: "SQL Injection vulnerability",
    description: "User input is directly concatenated into a SQL query without proper sanitization, allowing potential SQL injection attacks.",
    codeSnippet: `const query = "SELECT * FROM users WHERE id = " + userId;
db.query(query, (err, results) => {
  // Process results
});`,
    fixedCode: `const query = "SELECT * FROM users WHERE id = ?";
db.query(query, [userId], (err, results) => {
  // Process results
});`,
    fixExplanation: "Use parameterized queries instead of string concatenation to prevent SQL injection attacks. The placeholder (?) ensures the input is properly escaped."
  },
  {
    id: "2",
    severity: "high",
    owaspCategory: "A02:2021 - Cryptographic Failures",
    file: "src/utils/encryption.js",
    line: 15,
    tool: "Semgrep",
    title: "Weak cryptographic algorithm",
    description: "MD5 is used for password hashing, which is considered cryptographically broken and unsuitable for password storage.",
    codeSnippet: `const crypto = require('crypto');
const hash = crypto.createHash('md5')
  .update(password)
  .digest('hex');`,
    fixedCode: `const bcrypt = require('bcrypt');
const saltRounds = 10;
const hash = await bcrypt.hash(password, saltRounds);`,
    fixExplanation: "Replace MD5 with bcrypt for password hashing. Bcrypt is designed specifically for passwords and includes salt generation automatically."
  },
  {
    id: "3",
    severity: "critical",
    owaspCategory: "A07:2021 - Identification and Authentication Failures",
    file: "src/middleware/auth.js",
    line: 28,
    tool: "TruffleHog",
    title: "Hardcoded secret key",
    description: "A hardcoded JWT secret key was found in the source code. This is a critical security vulnerability as it can be used to forge authentication tokens.",
    codeSnippet: `const jwt = require('jsonwebtoken');
const SECRET_KEY = "hardcoded-secret-key-12345";
const token = jwt.sign(payload, SECRET_KEY);`,
    fixedCode: `const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) {
  throw new Error('JWT_SECRET environment variable is not set');
}
const token = jwt.sign(payload, SECRET_KEY);`,
    fixExplanation: "Store secrets in environment variables, never hardcode them. Use a strong, randomly generated secret key and manage it through environment variables."
  },
  {
    id: "4",
    severity: "high",
    owaspCategory: "A01:2021 - Broken Access Control",
    file: "src/api/documents.js",
    line: 67,
    tool: "Semgrep",
    title: "Missing authorization check",
    description: "Endpoint allows users to access documents without verifying if they have permission to view them.",
    codeSnippet: `app.get('/api/documents/:id', async (req, res) => {
  const doc = await Document.findById(req.params.id);
  res.json(doc);
});`,
    fixedCode: `app.get('/api/documents/:id', async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  if (doc.userId !== req.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(doc);
});`,
    fixExplanation: "Always verify that the authenticated user has permission to access the requested resource. Check ownership or permissions before returning sensitive data."
  },
  {
    id: "5",
    severity: "medium",
    owaspCategory: "A05:2021 - Security Misconfiguration",
    file: "src/server.js",
    line: 12,
    tool: "npm audit",
    title: "CORS misconfiguration",
    description: "CORS is configured to allow all origins, which can lead to unauthorized cross-origin requests.",
    codeSnippet: `app.use(cors({
  origin: '*',
  credentials: true
}));`,
    fixedCode: `const allowedOrigins = [
  'https://example.com',
  'https://app.example.com'
];
app.use(cors({
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));`,
    fixExplanation: "Restrict CORS to specific trusted origins instead of allowing all. Maintain a whitelist of allowed domains and validate the origin."
  },
  {
    id: "6",
    severity: "medium",
    owaspCategory: "A03:2021 - Injection",
    file: "src/api/search.js",
    line: 34,
    tool: "Semgrep",
    title: "Command injection vulnerability",
    description: "User input is passed directly to a shell command without sanitization.",
    codeSnippet: `const { exec } = require('child_process');
exec('grep ' + searchTerm + ' data.txt', (err, stdout) => {
  res.send(stdout);
});`,
    fixedCode: `const { execFile } = require('child_process');
const escapedTerm = searchTerm.replace(/[^a-zA-Z0-9]/g, '');
execFile('grep', [escapedTerm, 'data.txt'], (err, stdout) => {
  res.send(stdout);
});`,
    fixExplanation: "Use execFile instead of exec and pass arguments as an array. Sanitize and validate user input before using it in system commands."
  },
  {
    id: "7",
    severity: "low",
    owaspCategory: "A09:2021 - Security Logging and Monitoring Failures",
    file: "src/api/login.js",
    line: 89,
    tool: "Semgrep",
    title: "Missing security logging",
    description: "Failed login attempts are not logged, making it difficult to detect brute force attacks.",
    codeSnippet: `if (!validPassword) {
  return res.status(401).json({ error: 'Invalid credentials' });
}`,
    fixedCode: `if (!validPassword) {
  logger.warn('Failed login attempt', {
    username: req.body.username,
    ip: req.ip,
    timestamp: new Date()
  });
  return res.status(401).json({ error: 'Invalid credentials' });
}`,
    fixExplanation: "Log security-relevant events like failed login attempts. Include relevant details (username, IP, timestamp) to help detect and investigate security incidents."
  },
  {
    id: "8",
    severity: "high",
    owaspCategory: "A04:2021 - Insecure Design",
    file: "src/api/upload.js",
    line: 23,
    tool: "Semgrep",
    title: "Unrestricted file upload",
    description: "File upload endpoint does not validate file types or size, allowing potential upload of malicious files.",
    codeSnippet: `app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  res.json({ filename: file.filename });
});`,
    fixedCode: `const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
const maxSize = 5 * 1024 * 1024; // 5MB

app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({ error: 'Invalid file type' });
  }
  if (file.size > maxSize) {
    return res.status(400).json({ error: 'File too large' });
  }
  res.json({ filename: file.filename });
});`,
    fixExplanation: "Validate file types using MIME type checks and enforce size limits. Consider scanning uploaded files for malware and storing them outside the web root."
  },
  {
    id: "9",
    severity: "low",
    owaspCategory: "A05:2021 - Security Misconfiguration",
    file: "package.json",
    line: 1,
    tool: "npm audit",
    title: "Outdated dependencies",
    description: "Several npm packages have known vulnerabilities. Running npm audit shows 3 moderate and 1 high severity vulnerabilities.",
    codeSnippet: `"dependencies": {
  "express": "4.16.0",
  "jsonwebtoken": "8.3.0",
  "lodash": "4.17.11"
}`,
    fixedCode: `"dependencies": {
  "express": "4.18.2",
  "jsonwebtoken": "9.0.0",
  "lodash": "4.17.21"
}`,
    fixExplanation: "Regularly update dependencies to patch known vulnerabilities. Run 'npm audit fix' to automatically update to secure versions where possible."
  },
  {
    id: "10",
    severity: "medium",
    owaspCategory: "A01:2021 - Broken Access Control",
    file: "src/api/admin.js",
    line: 45,
    tool: "Semgrep",
    title: "Insecure direct object reference",
    description: "User can modify any user's profile by changing the ID in the request without proper authorization.",
    codeSnippet: `app.put('/api/users/:id', async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(user);
});`,
    fixedCode: `app.put('/api/users/:id', async (req, res) => {
  // Ensure user can only update their own profile or is admin
  if (req.params.id !== req.user.id && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const user = await User.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(user);
});`,
    fixExplanation: "Implement proper authorization checks. Users should only be able to modify their own resources unless they have elevated privileges."
  }
];

export const mockSecurityScore = {
  grade: "C",
  score: 68,
  totalVulnerabilities: 10,
  critical: 2,
  high: 3,
  medium: 3,
  low: 2
};

export const owaspCategories = [
  "A01:2021 - Broken Access Control",
  "A02:2021 - Cryptographic Failures",
  "A03:2021 - Injection",
  "A04:2021 - Insecure Design",
  "A05:2021 - Security Misconfiguration",
  "A06:2021 - Vulnerable and Outdated Components",
  "A07:2021 - Identification and Authentication Failures",
  "A08:2021 - Software and Data Integrity Failures",
  "A09:2021 - Security Logging and Monitoring Failures",
  "A10:2021 - Server-Side Request Forgery"
];

export const scanTools = ["Semgrep", "npm audit", "TruffleHog"];
