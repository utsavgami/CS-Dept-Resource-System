import bcrypt from 'bcryptjs';
import { User, Item, Booking, Message, Complaint, Rating, AppNotification } from '../src/types.js';

// In-Memory Persistent Store with initial seed data
export class DatabaseStore {
  public users: User[] = [];
  public items: Item[] = [];
  public bookings: Booking[] = [];
  public messages: Message[] = [];
  public complaints: Complaint[] = [];
  public ratings: Rating[] = [];
  public notifications: AppNotification[] = [];

  private initialized = false;

  public async init() {
    if (this.initialized) return;

    // Seed default admin and CS department students
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);
    const hashedStudentPassword = await bcrypt.hash('student123', 10);

    const defaultAdmin: User = {
      _id: 'usr_admin_001',
      name: 'Dr. Alan Turing (CS Dept Admin)',
      email: 'admin@cs.edu',
      enrollmentNumber: 'ADMIN-CS-000',
      mobileNumber: '+1-555-019-2831',
      department: 'Computer Science & Engineering',
      semester: 'Faculty / Admin',
      role: 'admin',
      verified: true,
      isBlocked: false,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      complaintCount: 0,
      createdAt: new Date('2025-01-01').toISOString(),
      updatedAt: new Date('2025-01-01').toISOString()
    };

    const student1: User = {
      _id: 'usr_std_101',
      name: 'Alex Chen',
      email: 'alex.chen@cs.edu',
      enrollmentNumber: 'CS2023001',
      mobileNumber: '+1-555-234-5678',
      department: 'Computer Science & Engineering',
      semester: '6th Semester',
      role: 'student',
      verified: true,
      isBlocked: false,
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200',
      complaintCount: 0,
      averageRating: 4.9,
      totalRatings: 12,
      createdAt: new Date('2025-01-10').toISOString(),
      updatedAt: new Date('2025-01-10').toISOString()
    };

    const student2: User = {
      _id: 'usr_std_102',
      name: 'Priya Sharma',
      email: 'priya.sharma@cs.edu',
      enrollmentNumber: 'CS2023045',
      mobileNumber: '+1-555-876-5432',
      department: 'Computer Science & Engineering',
      semester: '4th Semester',
      role: 'student',
      verified: true,
      isBlocked: false,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
      complaintCount: 0,
      averageRating: 4.8,
      totalRatings: 8,
      createdAt: new Date('2025-01-15').toISOString(),
      updatedAt: new Date('2025-01-15').toISOString()
    };

    const student3: User = {
      _id: 'usr_std_103',
      name: 'Marcus Vance',
      email: 'marcus.vance@cs.edu',
      enrollmentNumber: 'CS2022088',
      mobileNumber: '+1-555-333-9988',
      department: 'Computer Science & Engineering',
      semester: '8th Semester',
      role: 'student',
      verified: true,
      isBlocked: false,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
      complaintCount: 1,
      averageRating: 4.2,
      totalRatings: 5,
      createdAt: new Date('2025-01-20').toISOString(),
      updatedAt: new Date('2025-01-20').toISOString()
    };

    const student4: User = {
      _id: 'usr_std_104',
      name: 'David Miller (Risky User)',
      email: 'david.m@cs.edu',
      enrollmentNumber: 'CS2023099',
      mobileNumber: '+1-555-444-1122',
      department: 'Computer Science & Engineering',
      semester: '2nd Semester',
      role: 'student',
      verified: true,
      isBlocked: false,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
      complaintCount: 4, // 1 away from auto-block!
      averageRating: 2.5,
      totalRatings: 4,
      createdAt: new Date('2025-02-01').toISOString(),
      updatedAt: new Date('2025-02-01').toISOString()
    };

    this.users = [defaultAdmin, student1, student2, student3, student4];

    // Seed Items
    this.items = [
      {
        _id: 'itm_001',
        ownerId: student1._id,
        ownerName: student1.name,
        ownerEmail: student1.email,
        ownerPhone: student1.mobileNumber,
        ownerAvatar: student1.avatar,
        ownerSemester: student1.semester,
        title: 'Texas Instruments TI-84 Plus CE Graphing Calculator',
        category: 'Calculators',
        description: 'Perfect for Linear Algebra, Discrete Math, and Engineering Mathematics. Battery lasts 2 weeks. Comes with charging cable and sliding protective cover.',
        images: [
          'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&q=80&w=800'
        ],
        rentPricePerDay: 5,
        securityDeposit: 30,
        availability: true,
        condition: 'Like New',
        pickupLocation: 'CS Lab 3, 2nd Floor Engineering Building',
        createdAt: new Date('2025-02-10').toISOString(),
        updatedAt: new Date('2025-02-10').toISOString()
      },
      {
        _id: 'itm_002',
        ownerId: student2._id,
        ownerName: student2.name,
        ownerEmail: student2.email,
        ownerPhone: student2.mobileNumber,
        ownerAvatar: student2.avatar,
        ownerSemester: student2.semester,
        title: 'Raspberry Pi 4 Model B (8GB RAM) Starter Kit',
        category: 'Electronics',
        description: 'Includes 64GB MicroSD card with Raspbian preloaded, official red/white case, micro-HDMI cable, USB-C power supply, and breadboard sensor sensors kit for Embedded Systems / IoT projects.',
        images: [
          'https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&q=80&w=800'
        ],
        rentPricePerDay: 8,
        securityDeposit: 50,
        availability: true,
        condition: 'Good',
        pickupLocation: 'CS Department Library Lounge',
        createdAt: new Date('2025-02-12').toISOString(),
        updatedAt: new Date('2025-02-12').toISOString()
      },
      {
        _id: 'itm_003',
        ownerId: student1._id,
        ownerName: student1.name,
        ownerEmail: student1.email,
        ownerPhone: student1.mobileNumber,
        ownerAvatar: student1.avatar,
        ownerSemester: student1.semester,
        title: 'Introduction to Algorithms (CLRS 4th Edition - Hardcover)',
        category: 'Books',
        description: 'The Bible of Computer Science. Essential for Data Structures & Algorithms (CS 301) and Competitive Programming. No highlighting or written notes inside.',
        images: [
          'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800'
        ],
        rentPricePerDay: 3,
        securityDeposit: 25,
        availability: true,
        condition: 'Like New',
        pickupLocation: 'CS Main Hallway - Near Office 204',
        createdAt: new Date('2025-02-14').toISOString(),
        updatedAt: new Date('2025-02-14').toISOString()
      },
      {
        _id: 'itm_004',
        ownerId: student3._id,
        ownerName: student3.name,
        ownerEmail: student3.email,
        ownerPhone: student3.mobileNumber,
        ownerAvatar: student3.avatar,
        ownerSemester: student3.semester,
        title: 'Rigol DS1054Z 50MHz Digital Storage Oscilloscope',
        category: 'Lab Equipment',
        description: '4 Channel Digital Oscilloscope for Hardware Logic Design, Digital Circuits lab, and Microprocessor experiments. Fully functional with original probes.',
        images: [
          'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800'
        ],
        rentPricePerDay: 15,
        securityDeposit: 100,
        availability: true,
        condition: 'Good',
        pickupLocation: 'Microprocessor Lab 102',
        createdAt: new Date('2025-02-15').toISOString(),
        updatedAt: new Date('2025-02-15').toISOString()
      },
      {
        _id: 'itm_005',
        ownerId: student2._id,
        ownerName: student2.name,
        ownerEmail: student2.email,
        ownerPhone: student2.mobileNumber,
        ownerAvatar: student2.avatar,
        ownerSemester: student2.semester,
        title: 'Arduino Mega 2560 Ultimate Project Component Kit',
        category: 'Project Components',
        description: 'Over 100 components: Stepper motors, LCD displays, RFID reader, Ultrasonic sensors, Wi-Fi ESP8266 module, jumper wires, relays. Ideal for Capstone CS/IoT projects.',
        images: [
          'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800'
        ],
        rentPricePerDay: 6,
        securityDeposit: 35,
        availability: true,
        condition: 'New',
        pickupLocation: 'Student Activity Center, CS Wing',
        createdAt: new Date('2025-02-18').toISOString(),
        updatedAt: new Date('2025-02-18').toISOString()
      },
      {
        _id: 'itm_006',
        ownerId: student3._id,
        ownerName: student3.name,
        ownerEmail: student3.email,
        ownerPhone: student3.mobileNumber,
        ownerAvatar: student3.avatar,
        ownerSemester: student3.semester,
        title: 'Dell Thunderbolt 4 Docking Station (180W PD)',
        category: 'Laptop Accessories',
        description: 'Supports dual 4K monitors, gigabit Ethernet, 4 USB-A ports, 2 USB-C ports, and high-speed power delivery for CS students doing heavy workstation setups.',
        images: [
          'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&q=80&w=800'
        ],
        rentPricePerDay: 4,
        securityDeposit: 40,
        availability: true,
        condition: 'Like New',
        pickupLocation: 'CS Graduate Research Center',
        createdAt: new Date('2025-02-20').toISOString(),
        updatedAt: new Date('2025-02-20').toISOString()
      },
      {
        _id: 'itm_007',
        ownerId: student1._id,
        ownerName: student1.name,
        ownerEmail: student1.email,
        ownerPhone: student1.mobileNumber,
        ownerAvatar: student1.avatar,
        ownerSemester: student1.semester,
        title: 'Yonex Arcsaber Badminton Racket & Shuttlecocks Set',
        category: 'Sports Items',
        description: 'Great for inter-department sports tournaments or weekend breaks between coding hackathons! Comes with two rackets and 3 nylon shuttles.',
        images: [
          'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=800'
        ],
        rentPricePerDay: 3,
        securityDeposit: 15,
        availability: true,
        condition: 'Good',
        pickupLocation: 'Campus Sports Complex Entrance',
        createdAt: new Date('2025-02-22').toISOString(),
        updatedAt: new Date('2025-02-22').toISOString()
      }
    ];

    // Seed Bookings
    this.bookings = [
      {
        _id: 'bkg_001',
        itemId: 'itm_001',
        itemTitle: 'Texas Instruments TI-84 Plus CE Graphing Calculator',
        itemImage: 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&q=80&w=800',
        itemCategory: 'Calculators',
        rentPricePerDay: 5,
        securityDeposit: 30,
        borrowerId: student2._id,
        borrowerName: student2.name,
        borrowerEmail: student2.email,
        ownerId: student1._id,
        ownerName: student1.name,
        ownerEmail: student1.email,
        startDate: '2025-03-01',
        endDate: '2025-03-05',
        totalDays: 4,
        totalCost: 20,
        status: 'Accepted',
        createdAt: new Date('2025-02-25').toISOString(),
        updatedAt: new Date('2025-02-25').toISOString()
      },
      {
        _id: 'bkg_002',
        itemId: 'itm_003',
        itemTitle: 'Introduction to Algorithms (CLRS 4th Edition - Hardcover)',
        itemImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=800',
        itemCategory: 'Books',
        rentPricePerDay: 3,
        securityDeposit: 25,
        borrowerId: student3._id,
        borrowerName: student3.name,
        borrowerEmail: student3.email,
        ownerId: student1._id,
        ownerName: student1.name,
        ownerEmail: student1.email,
        startDate: '2025-02-15',
        endDate: '2025-02-20',
        totalDays: 5,
        totalCost: 15,
        status: 'Completed',
        createdAt: new Date('2025-02-14').toISOString(),
        updatedAt: new Date('2025-02-21').toISOString()
      }
    ];

    // Seed Messages for chat
    this.messages = [
      {
        _id: 'msg_001',
        bookingId: 'bkg_001',
        senderId: student2._id,
        senderName: student2.name,
        receiverId: student1._id,
        receiverName: student1.name,
        content: 'Hi Alex! I submitted a booking request for the TI-84 CE calculator for my Linear Algebra midterm.',
        timestamp: new Date('2025-02-25T10:30:00Z').toISOString(),
        isRead: true
      },
      {
        _id: 'msg_002',
        bookingId: 'bkg_001',
        senderId: student1._id,
        senderName: student1.name,
        receiverId: student2._id,
        receiverName: student2.name,
        content: 'Hey Priya! Absolutely, I accepted your request. We can meet in CS Lab 3 around 2 PM tomorrow.',
        timestamp: new Date('2025-02-25T11:15:00Z').toISOString(),
        isRead: true
      }
    ];

    // Seed Complaints
    this.complaints = [
      {
        _id: 'cmp_001',
        reporterId: student2._id,
        reporterName: student2.name,
        reportedUserId: student4._id,
        reportedUserName: student4.name,
        bookingId: 'bkg_old_999',
        itemTitle: 'Defective GPU Docking Case',
        type: 'Damaged Item',
        description: 'Item was delivered with burnt power connectors and failed immediately during testing. Owner refused to refund security deposit.',
        proofUrl: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&q=80&w=800',
        status: 'Pending',
        createdAt: new Date('2025-02-26').toISOString()
      }
    ];

    // Seed Ratings
    this.ratings = [
      {
        _id: 'rtg_001',
        bookingId: 'bkg_002',
        itemId: 'itm_003',
        reviewerId: student3._id,
        reviewerName: student3.name,
        revieweeId: student1._id,
        stars: 5,
        comment: 'Book was in perfect condition! Alex is very polite and punctual for pickup.',
        createdAt: new Date('2025-02-21').toISOString()
      }
    ];

    // Seed Notifications
    this.notifications = [
      {
        _id: 'ntf_001',
        userId: student2._id,
        title: 'Booking Accepted',
        message: 'Alex Chen accepted your rental request for TI-84 Plus CE Calculator.',
        type: 'booking',
        read: false,
        createdAt: new Date('2025-02-25T11:15:00Z').toISOString(),
        link: '/bookings'
      }
    ];

    this.initialized = true;
  }

  // Utility method to trigger auto-block check
  public checkAndApplyAutoBlock(userId: string): boolean {
    const user = this.users.find(u => u._id === userId);
    if (!user) return false;

    // Count resolved/verified complaints against user
    const userComplaints = this.complaints.filter(c => c.reportedUserId === userId);
    const verifiedCount = userComplaints.length;
    user.complaintCount = verifiedCount;

    if (user.complaintCount >= 5 && !user.isBlocked) {
      user.isBlocked = true;
      user.updatedAt = new Date().toISOString();

      // Create notification for user
      this.notifications.push({
        _id: `ntf_${Date.now()}_block`,
        userId: user._id,
        title: 'Account Blocked',
        message: 'Your account has been automatically blocked due to receiving 5 verified complaints. Please contact CS Department Admin.',
        type: 'system',
        read: false,
        createdAt: new Date().toISOString()
      });
      return true; // Newly blocked
    }
    return user.isBlocked;
  }
}

export const db = new DatabaseStore();
db.init();
