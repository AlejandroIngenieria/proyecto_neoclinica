'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import type { ResenaDto } from '@/types';

type SessionWithAccess = {
  accessToken?: string;
};


