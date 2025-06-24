import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { AudioLines, ImageIcon, ZapIcon } from "lucide-react";

interface StatsCardsProps {
  imageCount: number;
  voiceCount: number;
  credits: number;
}

const StatsCards = ({ imageCount, voiceCount, credits }: StatsCardsProps) => {
  return (    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card className="border bg-white dark:bg-gray-800 dark:border-gray-700 p-2 shadow-sm transition-shadow duration-200 hover:shadow-md dark:hover:shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium dark:text-gray-200">Total Images</CardTitle>
          <ImageIcon className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold dark:text-white">{imageCount}</div>
          <p className="text-xs text-muted-foreground dark:text-gray-400">
            Images generated so far
          </p>
        </CardContent>
      </Card>
      <Card className="border bg-white dark:bg-gray-800 dark:border-gray-700 p-2 shadow-sm transition-shadow duration-200 hover:shadow-md dark:hover:shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium dark:text-gray-200">Sound Effects</CardTitle>
          <AudioLines className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold dark:text-white">{voiceCount}</div>
          <p className="text-xs text-muted-foreground dark:text-gray-400">
            Sound effects generated so far
          </p>
        </CardContent>
      </Card>
      <Card className="border bg-white dark:bg-gray-800 dark:border-gray-700 p-2 shadow-sm transition-shadow duration-200 hover:shadow-md dark:hover:shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium dark:text-gray-200">Credits</CardTitle>
          <ZapIcon className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold dark:text-white">{credits}</div>
          <p className="text-xs text-muted-foreground dark:text-gray-400">
            Available generation credits
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsCards;
