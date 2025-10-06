import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Equipment {
  id: string;
  name: string;
  category: string;
  description: string | null;
  quantity_total: number;
  quantity_available: number;
  status: string;
  condition?: string;
  barcode?: string | null;
}

interface AddEditEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment | null;
  onSuccess: () => void;
}

export function AddEditEquipmentDialog({
  open,
  onOpenChange,
  equipment,
  onSuccess,
}: AddEditEquipmentDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    quantity_total: 0,
    quantity_available: 0,
    status: "available",
    condition: "good",
    barcode: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (equipment) {
      setFormData({
        name: equipment.name,
        category: equipment.category,
        description: equipment.description || "",
        quantity_total: equipment.quantity_total,
        quantity_available: equipment.quantity_available,
        status: equipment.status,
        condition: equipment.condition || "good",
        barcode: equipment.barcode || "",
      });
    } else {
      setFormData({
        name: "",
        category: "",
        description: "",
        quantity_total: 0,
        quantity_available: 0,
        status: "available",
        condition: "good",
        barcode: "",
      });
    }
  }, [equipment, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (equipment) {
        // Update existing equipment
        const { error } = await supabase
          .from("equipment")
          .update(formData)
          .eq("id", equipment.id);

        if (error) throw error;
        toast.success("Equipment updated successfully");
      } else {
        // Create new equipment
        const { error } = await supabase
          .from("equipment")
          .insert([formData]);

        if (error) throw error;
        toast.success("Equipment added successfully");
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to save equipment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{equipment ? "Edit Equipment" : "Add New Equipment"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Equipment Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Swimming, Floatation, Safety"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity_total">Total Quantity *</Label>
              <Input
                id="quantity_total"
                type="number"
                min="0"
                value={formData.quantity_total}
                onChange={(e) => setFormData({ ...formData, quantity_total: parseInt(e.target.value) || 0 })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity_available">Available Quantity *</Label>
              <Input
                id="quantity_available"
                type="number"
                min="0"
                max={formData.quantity_total}
                value={formData.quantity_available}
                onChange={(e) => setFormData({ ...formData, quantity_available: parseInt(e.target.value) || 0 })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="in use">In Use</SelectItem>
                  <SelectItem value="under maintenance">Under Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <Select value={formData.condition} onValueChange={(value) => setFormData({ ...formData, condition: value })}>
                <SelectTrigger id="condition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode (Optional)</Label>
              <Input
                id="barcode"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="Enter barcode number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Enter equipment description..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : equipment ? "Update" : "Add Equipment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
