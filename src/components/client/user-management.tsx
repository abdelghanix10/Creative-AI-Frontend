"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { toast } from "react-hot-toast";
import { Edit, UserX, UserCheck } from "lucide-react";

interface UserData {
  id: string;
  email: string;
  name?: string;
  subscriptionTier?: string;
  role?: string;
  isActive: boolean;
  subscription?: {
    id: string;
    status: string;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
    plan: string;
  };
  createdAt: Date;
}

export function UserManagement() {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<UserData | null>(
    null,
  );
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const fetchUsers = async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = (await response.json()) as { users: UserData[] };
        setUsers(data.users);
      } else {
        toast.error("Failed to load users");
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Failed to load users");
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
      setIsInitialLoading(false);
    }
  };

  const updateUser = async (userId: string, updates: Partial<UserData>) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });
      if (response.ok) {
        toast.success("User updated successfully");
        await fetchUsers(false);
        setIsEditDialogOpen(false);
        setEditingUser(null);
      } else {
        const error = await response.text();
        toast.error(`Failed to update user: ${error}`);
      }
    } catch (error) {
      console.error("Failed to update user:", error);
      toast.error("Failed to update user");
    } finally {
      setIsLoading(false);
    }
  };
  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    await updateUser(userId, { isActive });
  };

  const handleToggleUserStatus = async (user: UserData) => {
    if (user.isActive) {
      // Show confirmation dialog for deactivation
      setUserToDeactivate(user);
      setIsDeactivateDialogOpen(true);
    } else {
      // Activate user immediately
      await toggleUserStatus(user.id, true);
    }
  };

  const confirmDeactivateUser = async () => {
    if (userToDeactivate) {
      await toggleUserStatus(userToDeactivate.id, false);
      setIsDeactivateDialogOpen(false);
      setUserToDeactivate(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = filterRole === "all" || user.role === filterRole;

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && user.isActive) ||
      (filterStatus === "inactive" && !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800";
      case "trialing":
        return "bg-blue-100 text-blue-800";
      case "canceled":
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "incomplete":
      case "past_due":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleEditUser = (user: UserData) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  // Skeleton components
  const UserListSkeleton = () => (
    <Card className="flex flex-col gap-2">
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-32" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="flex flex-col items-start justify-between gap-2 border-b border-gray-200 pb-4 md:flex-row md:items-center"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-3 w-64" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="space-y-1 text-right">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="flex flex-col gap-2">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="search">Search Users</Label>{" "}
              <Input
                id="search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isInitialLoading || isLoading}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="role-filter">Role</Label>
              <Select
                value={filterRole}
                onValueChange={setFilterRole}
                disabled={isInitialLoading || isLoading}
              >
                <SelectTrigger className="h-full" id="role-filter">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select
                value={filterStatus}
                onValueChange={setFilterStatus}
                disabled={isInitialLoading || isLoading}
              >
                <SelectTrigger className="h-full" id="status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      {isInitialLoading ? (
        <UserListSkeleton />
      ) : (
        <Card className="flex flex-col gap-2">
          <CardHeader>
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-4 border-b border-gray-200 pb-4"
                >
                  <div className="flex w-full flex-col items-start justify-between gap-2 md:flex-row md:items-center">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {user.name ?? user.email}
                            </p>
                            {!user.isActive && (
                              <Badge variant="destructive">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Joined {formatDate(user.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 w-48">
                      <div className="space-y-1 text-left flex flex-col gap-2">
                        {user.subscription ? (
                          <>
                            <div className="flex items-center gap-2">
                              <Badge
                                className={getStatusColor(
                                  user.subscription.status,
                                )}
                              >
                                {user.subscription.status}
                              </Badge>
                              {user.role === "ADMIN" && (
                                <Badge variant="secondary">ADMIN</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-muted-foreground">
                                {user.subscription.plan ??
                                  user.subscriptionTier ??
                                  "Unknown Plan"}
                              </p>
                              {user.subscription.currentPeriodEnd && (
                                <p className="text-xs text-muted-foreground">
                                  {"- "}Until{" "}
                                  {formatDate(
                                    user.subscription.currentPeriodEnd,
                                  )}
                                </p>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                {user.subscriptionTier ?? "Free"}
                              </Badge>
                              {user.role === "ADMIN" && (
                                <Badge variant="secondary">ADMIN</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              No active subscription
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditUser(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>{" "}
                    <Button
                      variant={user.isActive ? "destructive" : "default"}
                      size="sm"
                      onClick={() => handleToggleUserStatus(user)}
                      disabled={isLoading}
                    >
                      {user.isActive ? (
                        <UserX className="h-4 w-4" />
                      ) : (
                        <UserCheck className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and settings.
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editingUser.name ?? ""}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, name: e.target.value })
                  }
                  placeholder="User name"
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  value={editingUser.email}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, email: e.target.value })
                  }
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={editingUser.role ?? "USER"}
                  onValueChange={(value) =>
                    setEditingUser({ ...editingUser, role: value })
                  }
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>{" "}
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-active"
                  checked={editingUser.isActive}
                  onCheckedChange={(checked: boolean) =>
                    setEditingUser({ ...editingUser, isActive: checked })
                  }
                />
                <Label htmlFor="edit-active">Account Active</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                editingUser && updateUser(editingUser.id, editingUser)
              }
              disabled={isLoading}
            >
              Save Changes
            </Button>{" "}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate User Confirmation Dialog */}
      <Dialog
        open={isDeactivateDialogOpen}
        onOpenChange={setIsDeactivateDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate User</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate this user? They will lose
              access to their account and all services.
            </DialogDescription>
          </DialogHeader>

          {userToDeactivate && (
            <div className="space-y-2">
              <p className="text-sm">
                <strong>User:</strong>{" "}
                {userToDeactivate.name ?? userToDeactivate.email}
              </p>
              <p className="text-sm">
                <strong>Email:</strong> {userToDeactivate.email}
              </p>
              {userToDeactivate.subscription && (
                <p className="text-sm">
                  <strong>Subscription:</strong>{" "}
                  {userToDeactivate.subscription.plan} (
                  {userToDeactivate.subscription.status})
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeactivateDialogOpen(false);
                setUserToDeactivate(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeactivateUser}
              disabled={isLoading}
            >
              Deactivate User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
