
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { AudioLines, ImageIcon,  ZapIcon } from 'lucide-react'

interface StatsCardsProps {
  imageCount: number;
  voiceCount: number;
  credits: number;
}

const StatsCards = ({imageCount,voiceCount, credits }:StatsCardsProps) => {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card className="border bg-white p-2 shadow-sm transition-shadow duration-200 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Images</CardTitle>
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{imageCount}</div>
          <p className="text-xs text-muted-foreground">
            Images generated so far
          </p>
        </CardContent>
      </Card>

      <Card className="border bg-white p-2 shadow-sm transition-shadow duration-200 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Voices</CardTitle>
          <AudioLines className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{voiceCount}</div>
          <p className="text-xs text-muted-foreground">
            Voices generated so far
          </p>
        </CardContent>
      </Card>

      <Card className="border bg-white p-2 shadow-sm transition-shadow duration-200 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Credits</CardTitle>
          <ZapIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{credits}</div>
          <p className="text-xs text-muted-foreground">
            Available generation credits
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default StatsCards