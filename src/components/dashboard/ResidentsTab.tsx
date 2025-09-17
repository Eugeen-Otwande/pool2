import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Users, UserPlus, Eye } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface Resident {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  created_at: string;
}

const ResidentsTab = () => {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newResident, setNewResident] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Resident',
    password: ''
  });

  useEffect(() => {
    fetchResidents();
  }, []);

  const fetchResidents = async () => {
    try {
      const { data, error } = await supabase
        .from('residents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResidents(data || []);
    } catch (error) {
      toast.error('Error fetching residents');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const addResident = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('residents')
        .insert([{
          name: newResident.name,
          email: newResident.email,
          phone: newResident.phone,
          role: newResident.role,
          password_hash: newResident.password // In real app, this should be hashed
        }]);

      if (error) throw error;
      
      toast.success('Resident added successfully');
      setShowAddDialog(false);
      setNewResident({
        name: '',
        email: '',
        phone: '',
        role: 'Resident',
        password: ''
      });
      fetchResidents();
    } catch (error) {
      toast.error('Error adding resident');
      console.error('Error:', error);
    }
  };

  const filteredResidents = residents.filter(resident => {
    const matchesSearch = resident.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resident.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || resident.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'Resident': "default",
      'Staff': "secondary",
      'Student': "outline",
      'RCMRD Team': "destructive"
    };
    return <Badge variant={variants[role] || "outline"}>{role}</Badge>;
  };

  if (loading) {
    return <div className="p-8 text-center">Loading residents...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Residents Management</h2>
          <p className="text-gray-600">Manage pool residents and their access</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Resident
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Resident</DialogTitle>
              <DialogDescription>
                Create a new resident account for pool access
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={addResident} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={newResident.name}
                  onChange={(e) => setNewResident({ ...newResident, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newResident.email}
                  onChange={(e) => setNewResident({ ...newResident, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newResident.phone}
                  onChange={(e) => setNewResident({ ...newResident, phone: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={newResident.role} onValueChange={(value) => setNewResident({ ...newResident, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Resident">Resident</SelectItem>
                    <SelectItem value="Staff">Staff</SelectItem>
                    <SelectItem value="Student">Student</SelectItem>
                    <SelectItem value="RCMRD Team">RCMRD Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newResident.password}
                  onChange={(e) => setNewResident({ ...newResident, password: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Add Resident</Button>
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Residents</p>
                <p className="text-2xl font-bold">{residents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Staff</p>
                <p className="text-2xl font-bold">
                  {residents.filter(r => r.role === 'Staff').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Students</p>
                <p className="text-2xl font-bold">
                  {residents.filter(r => r.role === 'Student').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">RCMRD Team</p>
                <p className="text-2xl font-bold">
                  {residents.filter(r => r.role === 'RCMRD Team').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search residents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="Resident">Resident</SelectItem>
            <SelectItem value="Staff">Staff</SelectItem>
            <SelectItem value="Student">Student</SelectItem>
            <SelectItem value="RCMRD Team">RCMRD Team</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Residents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Resident Records</CardTitle>
          <CardDescription>
            View and manage all pool residents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResidents.map((resident) => (
                <TableRow key={resident.id}>
                  <TableCell className="font-medium">{resident.name}</TableCell>
                  <TableCell>{resident.email}</TableCell>
                  <TableCell>{resident.phone}</TableCell>
                  <TableCell>{getRoleBadge(resident.role)}</TableCell>
                  <TableCell>{new Date(resident.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResidentsTab;