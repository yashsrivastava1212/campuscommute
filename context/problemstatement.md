# Problem Statement

**Project:** CampusCommute — A Student Carpooling Platform for Campus-to-Transit Travel

---

## 1. Background

Students living on or around college campuses frequently travel to common destinations such as airports, railway stations, bus terminals, and nearby cities. These trips usually occur during weekends, semester breaks, holidays, internships, placements, and vacations.

Although many students travel to the same destination at approximately the same time, there is currently **no centralized platform** that enables them to discover one another and organize shared taxi rides. Instead, students rely on fragmented communication channels such as WhatsApp groups, Telegram groups, personal contacts, or word-of-mouth. These methods are unreliable, difficult to manage, and often fail to connect students making similar journeys.

As a result, multiple taxis leave campus with only one or two passengers, leading to:

- Higher transportation costs
- Unnecessary traffic congestion
- Inefficient utilization of available taxi capacity

---

## 2. Problem Statement

> **Campus commuters lack a simple, centralized platform to discover fellow students travelling to the same destination at similar times, making it difficult to organize safe, affordable, and efficient taxi carpools.**

---

## 3. Context

Consider a common scenario at **Goa Institute of Management (GIM)**:

| Student | Destination | Departure Time |
|---------|-------------|----------------|
| Student A | GOX Airport | 5:30 AM |
| Student B | GOX Airport | 5:45 AM |
| Student C | GOX Airport | 6:00 AM |

Since these students are unaware of each other's travel plans, each books a separate taxi.

Instead of **one taxi carrying four passengers**, three different taxis are booked for nearly identical trips. This significantly increases travel costs while reducing overall transportation efficiency.

The core problem is **not the lack of taxis**, but the **absence of a system** that helps students discover others with similar travel plans and coordinate shared transportation.

---

## 4. Existing Challenges

### 4.1 Lack of Centralized Discovery

Students have no dedicated platform where they can browse existing travel plans or discover other students travelling to the same destination. Finding travel companions depends entirely on personal networks or messaging groups, which limits participation and excludes many students.

### 4.2 High Transportation Costs

Taxi fares become significantly more affordable when shared among multiple passengers. However, due to poor coordination, students frequently book individual taxis, resulting in unnecessary expenses.

### 4.3 Poor Visibility of Similar Travel Plans

Students often realize **after completing their journey** that several other classmates travelled to the exact same destination at almost the same time. This represents a missed opportunity for ride sharing and cost reduction.

### 4.4 Inefficient Communication

Current coordination methods rely on external platforms such as:

- WhatsApp groups
- Telegram groups
- Phone calls
- Personal messages

These conversations become cluttered, difficult to track, and inaccessible to students who are not already members of those groups.

### 4.5 Low Taxi Utilization

Many taxis depart with only one or two passengers despite having the capacity to accommodate four or more. This results in:

- Higher travel costs per student
- Increased number of taxis entering and leaving campus
- Greater traffic congestion
- Inefficient utilization of transportation resources

### 4.6 No Structured Trip Coordination

Even after students find travel companions, they must coordinate meeting points, departure times, and last-minute updates through external messaging applications. There is no trip-specific communication space dedicated to that journey.

---

## 5. Root Causes

The problem exists because:

1. There is no dedicated student carpooling platform.
2. Travel plans are scattered across multiple communication channels.
3. Students cannot browse or discover existing carpools.
4. There is no structured join-request process.
5. There is no mechanism for managing ownership, members, and available seats.
6. There is no functionality to combine partially filled carpools into a single taxi.

---

## 6. Target Users

The primary users of the platform include:

- College students
- Hostel residents
- Day scholars travelling from campus

Students travelling to:

- Airports
- Railway stations
- Bus terminals
- Nearby cities

---

## 7. Proposed Solution (Overview)

**CampusCommute** is a centralized platform that enables students to discover, create, and manage shared taxi rides.

The platform allows students to:

- Create a new carpool
- Browse existing carpools
- Request to join a carpool
- Accept or reject join requests
- Coordinate using a temporary **Trip Discussion** room
- Share contact information only after becoming confirmed members
- Lock a carpool once the group is finalized
- Automatically transfer ownership if the current owner leaves
- Merge compatible carpools to maximize taxi occupancy
- Archive completed trips automatically

---

## 8. Key Functional Principles

### Single Active Carpool

A student may belong to only **one active carpool** at a time. If the student leaves the carpool or the trip is completed, they may either create a new carpool or join another one.

### Owner Responsibilities

The owner is responsible for:

- Accepting or rejecting join requests
- Removing members if necessary
- Locking the carpool
- Updating trip details

If the owner leaves the carpool, ownership is automatically transferred to the next eligible member.

### Join Request Management

Students can request to join any open carpool. Join requests automatically close **30 minutes before** the scheduled departure time.

### Temporary Trip Discussion

Each carpool contains a lightweight discussion room exclusively for confirmed members. The discussion room enables members to coordinate meeting points and travel-related updates without relying on external messaging applications. The discussion room is automatically archived after the trip.

### Carpool Merge

To maximize taxi occupancy, the system automatically identifies compatible carpools based on:

- Destination
- Travel date
- Departure time
- Available capacity

If both owners approve, the two carpools are merged into a new carpool, allowing students to share a single taxi instead of booking multiple vehicles.

---

## 9. Expected Benefits

### For Students

- Reduced transportation costs
- Easier discovery of fellow travellers
- Improved safety by travelling with known students
- Better trip coordination
- Reduced dependence on external messaging applications

### For the Institution

- Improved taxi utilization
- Reduced number of taxis entering and leaving campus
- Lower traffic congestion
- Better campus transportation management
- Increased collaboration among students

---

## 10. Success Criteria

The proposed solution will be considered successful if it:

- Increases the average number of passengers per taxi
- Reduces duplicate taxi bookings
- Encourages students to join existing carpools instead of creating new ones
- Successfully merges compatible carpools whenever possible
- Provides a simple and seamless coordination experience
- Reduces overall transportation costs for students

---

## 11. Vision Statement

CampusCommute aims to become the **primary campus mobility platform** that enables students travelling to similar destinations to:

- Easily discover one another
- Form shared taxi groups
- Coordinate efficiently through temporary trip discussions
- Maximize taxi occupancy through intelligent carpool merging
- Travel together safely, conveniently, and affordably
