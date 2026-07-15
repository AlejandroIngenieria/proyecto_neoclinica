'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { fetchResenasPorMedico } from '@/services/resenas';
import type { ResenaDto } from '@/types';

type SessionWithAccess = {
  accessToken?: string;
};


