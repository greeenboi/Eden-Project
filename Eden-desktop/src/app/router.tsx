import { createHashRouter } from "react-router-dom";
import { AppShell } from "@/app/AppShell";
import { RequireAuth } from "@/app/RequireAuth";
import { AlbumDetailPage } from "@/features/catalog/AlbumDetailPage";
import { AllSongsPage } from "@/features/catalog/AllSongsPage";
import { ArtistDetailPage } from "@/features/catalog/ArtistDetailPage";
import { ArtistsPage } from "@/features/catalog/ArtistsPage";
import { HomePage } from "@/features/catalog/HomePage";
import { SearchPage } from "@/features/catalog/SearchPage";
import { AuthPage } from "@/features/auth/AuthPage";
import { QueuePage } from "@/features/queue/QueuePage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { SplashPage } from "@/features/stubs/SplashPage";
import { StubPage } from "@/features/stubs/StubPage";

export const router = createHashRouter([
  {
    path: "/auth",
    element: <AuthPage />,
  },
  {
    path: "/mini-player",
    element: <QueuePage mini />, 
  },
  {
    path: "/splash",
    element: <SplashPage />,
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: "/",
        element: <AppShell />,
        children: [
          { index: true, element: <HomePage /> },
          { path: "songs", element: <AllSongsPage /> },
          { path: "artists", element: <ArtistsPage /> },
          { path: "artists/:artistId", element: <ArtistDetailPage /> },
          { path: "albums/:albumId", element: <AlbumDetailPage /> },
          { path: "search", element: <SearchPage /> },
          { path: "queue", element: <QueuePage /> },
          { path: "settings", element: <SettingsPage /> },
          { path: "admin-upload", element: <StubPage title="Upload Flow Stub" /> },
          { path: "admin-dashboard", element: <StubPage title="Admin Flow Stub" /> },
        ],
      },
    ],
  },
]);
