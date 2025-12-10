import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface DocumentRequest {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  age: number;
  birth_date: string;
  address: string;
  zone_id: string;
  contact: string;
  email?: string;
  marital_status: 'single' | 'married' | 'widowed' | 'separated';
  document_type: 'zone_clearance' | 'indigency' | 'clearance';
  purpose: string;
  has_zone_clearance: boolean;
  zone_clearance_file_url?: string;
  zone_clearance_reference?: string; // Reference number of the zone clearance used for verification
  valid_id_file_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  reference_number: string; // Now required - generated immediately on submission
  rejection_reason?: string;
  request_date: string;
  processed_by?: string;
  processed_at?: string;
  updated_at?: string;
}

interface Zone {
  id: string;
  zone_number: number;
  zone_name: string;
  zone_leader?: string;
  leader_contact?: string;
  created_at?: string;
}

interface AdminUser {
  id: string;
  email: string;
  password: string;
  full_name: string;
  created_at: string;
}

interface BarangayDB extends DBSchema {
  document_requests: {
    key: string;
    value: DocumentRequest;
    indexes: { 
      'by-email': string; 
      'by-contact': string; 
      'by-status': string;
      'by-document-type': string;
      'by-reference-number': string;
    };
  };
  zones: {
    key: string;
    value: Zone;
    indexes: { 'by-zone-number': number };
  };
  admin_users: {
    key: string;
    value: AdminUser;
    indexes: { 'by-email': string };
  };
  files: {
    key: string;
    value: { id: string; data: string; type: string; name: string };
  };
}

let db: IDBPDatabase<BarangayDB> | null = null;

export async function getDb(): Promise<IDBPDatabase<BarangayDB>> {
  if (db) return db;

  db = await openDB<BarangayDB>('barangay-bayabas', 2, {
    upgrade(database, oldVersion) {
      // Handle upgrade from version 1
      if (oldVersion < 1) {
        // Document requests store
        const requestStore = database.createObjectStore('document_requests', { keyPath: 'id' });
        requestStore.createIndex('by-email', 'email');
        requestStore.createIndex('by-contact', 'contact');
        requestStore.createIndex('by-status', 'status');
        requestStore.createIndex('by-document-type', 'document_type');
        requestStore.createIndex('by-reference-number', 'reference_number');

        // Zones store
        const zoneStore = database.createObjectStore('zones', { keyPath: 'id' });
        zoneStore.createIndex('by-zone-number', 'zone_number');

        // Admin users store
        const adminStore = database.createObjectStore('admin_users', { keyPath: 'id' });
        adminStore.createIndex('by-email', 'email');

        // Files store (for uploaded documents)
        database.createObjectStore('files', { keyPath: 'id' });
      }
      
      // Handle upgrade from version 1 to 2 - add reference number index
      if (oldVersion < 2 && oldVersion >= 1) {
        const requestStore = database.objectStoreNames.contains('document_requests') 
          ? (database as any).transaction.objectStore('document_requests')
          : null;
        if (requestStore && !requestStore.indexNames.contains('by-reference-number')) {
          requestStore.createIndex('by-reference-number', 'reference_number');
        }
      }
    },
  });

  // Initialize with default zones if empty
  const zonesCount = await db.count('zones');
  if (zonesCount === 0) {
    await initializeDefaultData(db);
  }

  return db;
}

async function initializeDefaultData(database: IDBPDatabase<BarangayDB>) {
  // Add default zones
  const defaultZones: Zone[] = [
    { id: 'zone-1', zone_number: 1, zone_name: 'Zone 1 - Purok Uno' },
    { id: 'zone-2', zone_number: 2, zone_name: 'Zone 2 - Purok Dos' },
    { id: 'zone-3', zone_number: 3, zone_name: 'Zone 3 - Purok Tres' },
    { id: 'zone-4', zone_number: 4, zone_name: 'Zone 4 - Purok Kwatro' },
    { id: 'zone-5', zone_number: 5, zone_name: 'Zone 5 - Purok Singko' },
    { id: 'zone-6', zone_number: 6, zone_name: 'Zone 6 - Purok Seis' },
  ];

  for (const zone of defaultZones) {
    await database.add('zones', zone);
  }

  // Add default admin user (password: admin123)
  const defaultAdmin: AdminUser = {
    id: 'admin-1',
    email: 'admin@barangay.gov.ph',
    password: 'admin123', // In production, use proper hashing
    full_name: 'Barangay Administrator',
    created_at: new Date().toISOString(),
  };
  await database.add('admin_users', defaultAdmin);
}

// Generate unique ID
export function generateId(): string {
  return 'req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

// Generate reference number with document type prefix
export function generateReferenceNumber(documentType: 'zone_clearance' | 'indigency' | 'clearance'): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  
  // Different prefixes for different document types
  const prefix = documentType === 'zone_clearance' ? 'ZC' : 
                 documentType === 'clearance' ? 'BC' : 'BI';
  
  return `${prefix}-${year}${month}${day}-${random}`;
}

// Document Requests - Now generates reference number immediately
export async function createDocumentRequest(data: Omit<DocumentRequest, 'id' | 'status' | 'request_date' | 'reference_number'>): Promise<DocumentRequest> {
  const database = await getDb();
  const request: DocumentRequest = {
    ...data,
    id: generateId(),
    status: 'pending',
    request_date: new Date().toISOString(),
    reference_number: generateReferenceNumber(data.document_type), // Generate immediately
  };
  await database.add('document_requests', request);
  return request;
}

export async function getDocumentRequests(): Promise<DocumentRequest[]> {
  const database = await getDb();
  const requests = await database.getAll('document_requests');
  return requests.sort((a, b) => new Date(b.request_date).getTime() - new Date(a.request_date).getTime());
}

export async function getDocumentRequestById(id: string): Promise<DocumentRequest | undefined> {
  const database = await getDb();
  return database.get('document_requests', id);
}

// Search by reference number
export async function searchDocumentRequests(referenceNumber: string): Promise<DocumentRequest[]> {
  const database = await getDb();
  const allRequests = await database.getAll('document_requests');
  return allRequests.filter(
    req => req.reference_number?.toLowerCase() === referenceNumber.toLowerCase()
  ).sort((a, b) => new Date(b.request_date).getTime() - new Date(a.request_date).getTime());
}

// Verify approved zone clearance by reference number
export async function getApprovedZoneClearanceByRefNumber(referenceNumber: string): Promise<DocumentRequest | undefined> {
  const database = await getDb();
  const allRequests = await database.getAll('document_requests');
  return allRequests.find(
    req => 
      req.document_type === 'zone_clearance' && 
      req.status === 'approved' &&
      req.reference_number?.toLowerCase() === referenceNumber.toLowerCase()
  );
}

// Keep legacy function for backwards compatibility but deprecated
export async function getApprovedZoneClearance(email?: string, phone?: string): Promise<DocumentRequest | undefined> {
  const database = await getDb();
  const allRequests = await database.getAll('document_requests');
  return allRequests.find(
    req => 
      req.document_type === 'zone_clearance' && 
      req.status === 'approved' &&
      (email ? req.email === email : req.contact === phone)
  );
}

export async function updateDocumentRequest(id: string, updates: Partial<DocumentRequest>): Promise<void> {
  const database = await getDb();
  const existing = await database.get('document_requests', id);
  if (existing) {
    const updated = { 
      ...existing, 
      ...updates, 
      updated_at: new Date().toISOString(),
    };
    await database.put('document_requests', updated);
  }
}

// Zones
export async function getZones(): Promise<Zone[]> {
  const database = await getDb();
  const zones = await database.getAll('zones');
  return zones.sort((a, b) => a.zone_number - b.zone_number);
}

export async function getZoneById(id: string): Promise<Zone | undefined> {
  const database = await getDb();
  return database.get('zones', id);
}

// Admin Auth
export async function adminLogin(email: string, password: string): Promise<AdminUser | null> {
  const database = await getDb();
  const users = await database.getAllFromIndex('admin_users', 'by-email', email);
  const user = users[0];
  if (user && user.password === password) {
    localStorage.setItem('admin_session', JSON.stringify({ id: user.id, email: user.email, full_name: user.full_name }));
    return user;
  }
  return null;
}

export async function adminSignup(email: string, password: string, fullName: string): Promise<AdminUser | null> {
  const database = await getDb();
  const existing = await database.getAllFromIndex('admin_users', 'by-email', email);
  if (existing.length > 0) {
    throw new Error('Email already exists');
  }
  const user: AdminUser = {
    id: 'admin-' + Date.now(),
    email,
    password,
    full_name: fullName,
    created_at: new Date().toISOString(),
  };
  await database.add('admin_users', user);
  return user;
}

export function getAdminSession(): { id: string; email: string; full_name: string } | null {
  const session = localStorage.getItem('admin_session');
  return session ? JSON.parse(session) : null;
}

export function adminLogout(): void {
  localStorage.removeItem('admin_session');
}

// File storage (as base64)
export async function saveFile(file: File): Promise<string> {
  const database = await getDb();
  const id = 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      await database.add('files', {
        id,
        data: reader.result as string,
        type: file.type,
        name: file.name,
      });
      resolve(id);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function getFile(id: string): Promise<{ data: string; type: string; name: string } | undefined> {
  const database = await getDb();
  return database.get('files', id);
}