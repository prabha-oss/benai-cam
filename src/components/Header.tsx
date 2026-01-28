"use client";

import { useState, useRef, useEffect } from "react";
import { PanelRightOpen, PanelRightClose, Calendar, Bell, Check, X, AlertTriangle, Info, CheckCircle, AlertCircle } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface HeaderProps {
    isRightPanelOpen: boolean;
    onToggleRightPanel: () => void;
}

export function Header({ isRightPanelOpen, onToggleRightPanel }: HeaderProps) {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    const [showNotifications, setShowNotifications] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);

    const notifications = useQuery(api.notifications.list, { limit: 10 }) || [];
    const unreadCount = useQuery(api.notifications.unreadCount) || 0;
    const markAsRead = useMutation(api.notifications.markAsRead);
    const markAllAsRead = useMutation(api.notifications.markAllAsRead);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getIcon = (type: string) => {
        switch (type) {
            case "health_alert": return <AlertTriangle className="w-4 h-4 text-orange-500" />;
            case "deployment_success": return <CheckCircle className="w-4 h-4 text-green-500" />;
            case "deployment_failure": return <AlertCircle className="w-4 h-4 text-red-500" />;
            default: return <Info className="w-4 h-4 text-blue-500" />;
        }
    };

    return (
        <header className="h-16 bg-white border-b border-border/50 flex items-center justify-end px-6 gap-3 sticky top-0 z-30">
            {/* Date Display */}
            <span className="text-sm text-muted-foreground mr-auto md:mr-0">{formattedDate}</span>

            {/* Calendar Button */}
            <button className="w-10 h-10 rounded-xl bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                <Calendar className="w-5 h-5" />
            </button>

            {/* Notifications Button */}
            <div className="relative" ref={notificationRef}>
                <button
                    className="w-10 h-10 rounded-xl bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative"
                    onClick={() => setShowNotifications(!showNotifications)}
                >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full ring-2 ring-white"></span>
                    )}
                </button>

                {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-2xl shadow-xl border border-border/50 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-border/50 flex justify-between items-center">
                            <h3 className="font-semibold text-sm">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    className="text-xs text-primary hover:text-primary/80 font-medium"
                                    onClick={() => markAllAsRead()}
                                >
                                    Mark all as read
                                </button>
                            )}
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground text-sm">
                                    No notifications
                                </div>
                            ) : (
                                <div>
                                    {notifications.map((notification: any) => (
                                        <div
                                            key={notification._id}
                                            className={cn(
                                                "p-4 border-b border-border/50 hover:bg-muted/30 transition-colors flex gap-3",
                                                !notification.read && "bg-blue-50/30"
                                            )}
                                        >
                                            <div className="mt-1 flex-shrink-0">
                                                {getIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex justify-between items-start">
                                                    <p className={cn("text-sm font-medium", !notification.read && "text-foreground")}>
                                                        {notification.title}
                                                    </p>
                                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                                        {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                    {notification.message}
                                                </p>
                                            </div>
                                            {!notification.read && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        markAsRead({ id: notification._id });
                                                    }}
                                                    className="w-2 h-2 mt-2 bg-primary rounded-full hover:scale-110 transition-transform"
                                                    title="Mark as read"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Right Panel Toggle */}
            <button
                onClick={onToggleRightPanel}
                className="w-10 h-10 rounded-xl bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
                {isRightPanelOpen ? (
                    <PanelRightClose className="w-5 h-5" />
                ) : (
                    <PanelRightOpen className="w-5 h-5" />
                )}
            </button>
        </header>
    );
}
