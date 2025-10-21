import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMotorcycleSchema, BIKE_CATEGORIES, CATEGORY_SUBCATEGORIES } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InsertMotorcycle } from "@shared/schema";

interface MotorcycleFormProps {
  motorcycle?: any;
  onClose: () => void;
}

export default function MotorcycleForm({ motorcycle, onClose }: MotorcycleFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState(motorcycle?.bikeCategory || "");

  const form = useForm<InsertMotorcycle>({
    resolver: zodResolver(
      motorcycle 
        ? insertMotorcycleSchema  // For updates, require all fields including recid
        : insertMotorcycleSchema.omit({ recid: true })  // For creates, omit recid requirement
    ),
    defaultValues: {
      recid: motorcycle?.recid || undefined,
      biketype: motorcycle?.biketype || 1,
      bikeCategory: motorcycle?.bikeCategory || null,
      bikeSubcategory: motorcycle?.bikeSubcategory || null,
      bikemake: motorcycle?.bikemake || "",
      bikemodel: motorcycle?.bikemodel || "",
      firstyear: motorcycle?.firstyear || new Date().getFullYear(),
      lastyear: motorcycle?.lastyear || new Date().getFullYear(),
      capacity: motorcycle?.capacity || undefined,
    },
  });

  const createMotorcycleMutation = useMutation({
    mutationFn: (data: InsertMotorcycle) => 
      apiRequest("POST", "/api/motorcycles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/motorcycles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Motorcycle created successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create motorcycle",
        variant: "destructive",
      });
    },
  });

  const updateMotorcycleMutation = useMutation({
    mutationFn: (data: InsertMotorcycle) => 
      apiRequest("PUT", `/api/motorcycles/${motorcycle.recid}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/motorcycles"] });
      toast({
        title: "Success",
        description: "Motorcycle updated successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update motorcycle",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertMotorcycle) => {
    if (motorcycle) {
      updateMotorcycleMutation.mutate(data);
    } else {
      createMotorcycleMutation.mutate(data);
    }
  };

  const isLoading = createMotorcycleMutation.isPending || updateMotorcycleMutation.isPending;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {motorcycle ? "Edit Motorcycle" : "Add Motorcycle"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="bikemake"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Make</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Honda, Yamaha, Kawasaki..." 
                      {...field}
                      data-testid="input-motorcycle-make"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bikemodel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="CBR600RR, MT-09, Ninja ZX-6R..." 
                      {...field}
                      data-testid="input-motorcycle-model"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="firstyear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Year</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="1900"
                        max={new Date().getFullYear() + 1}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-motorcycle-firstyear"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastyear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Year</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="1900"
                        max={new Date().getFullYear() + 1}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-motorcycle-lastyear"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity (cc)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="599, 889..."
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        data-testid="input-motorcycle-capacity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bikeCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select 
                      value={field.value || ""} 
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedCategory(value);
                        // Clear subcategory when category changes
                        form.setValue("bikeSubcategory", null);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-motorcycle-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={BIKE_CATEGORIES.OFF_ROAD}>{BIKE_CATEGORIES.OFF_ROAD}</SelectItem>
                        <SelectItem value={BIKE_CATEGORIES.STREET}>{BIKE_CATEGORIES.STREET}</SelectItem>
                        <SelectItem value={BIKE_CATEGORIES.ATV}>{BIKE_CATEGORIES.ATV}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bikeSubcategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategory</FormLabel>
                    <Select 
                      value={field.value || ""} 
                      onValueChange={(value) => field.onChange(value)}
                      disabled={!selectedCategory}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-motorcycle-subcategory">
                          <SelectValue placeholder={selectedCategory ? "Select subcategory" : "Select category first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {selectedCategory && CATEGORY_SUBCATEGORIES[selectedCategory]?.map((subcat) => (
                          <SelectItem key={subcat} value={subcat}>
                            {subcat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="biketype"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Legacy Type (for compatibility)</FormLabel>
                  <Select value={field.value?.toString()} onValueChange={(value) => field.onChange(parseInt(value))}>
                    <FormControl>
                      <SelectTrigger data-testid="select-motorcycle-biketype">
                        <SelectValue placeholder="Select bike type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">Street/Road</SelectItem>
                      <SelectItem value="2">Dirt/Off-road</SelectItem>
                      <SelectItem value="5">Dual Sport</SelectItem>
                      <SelectItem value="6">ATV/Quad</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                data-testid="button-cancel-motorcycle"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                data-testid="button-save-motorcycle"
              >
                {isLoading ? "Saving..." : motorcycle ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
