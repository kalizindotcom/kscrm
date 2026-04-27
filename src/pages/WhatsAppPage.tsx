import React from 'react';
import { MessageSquare, Users, Activity, Image as ImageIcon, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/shared';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export const WhatsAppPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Users,
      title: 'Contatos',
      description: 'Gerencie sua base de contatos, crie listas e organize seus leads',
      path: '/contacts',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
    {
      icon: Activity,
      title: 'WhatsApp Web',
      description: 'Monitore conversas em tempo real e interaja com seus clientes',
      path: '/live-view',
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
    },
    {
      icon: Users,
      title: 'Grupos',
      description: 'Sincronize e gerencie grupos do WhatsApp, exporte contatos',
      path: '/groups',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
    },
    {
      icon: ImageIcon,
      title: 'Stories',
      description: 'Visualize e interaja com os stories dos seus contatos',
      path: '/stories',
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2"
      >
        <h1 className="text-3xl font-bold text-neon-gradient flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-primary" />
          WhatsApp
        </h1>
        <p className="text-muted-foreground">
          Central de gerenciamento completo do WhatsApp - Contatos, conversas, grupos e stories
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feature, index) => (
          <motion.div
            key={feature.path}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              onClick={() => navigate(feature.path)}
              className={cn(
                'cursor-pointer hover:scale-[1.02] transition-all duration-300 group',
                'bg-card/40 backdrop-blur-md border-primary/20 hover:border-primary/40',
                'shadow-lg hover:shadow-xl hover:shadow-primary/10'
              )}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
                        'transition-transform duration-300 group-hover:scale-110',
                        feature.bgColor,
                        'border',
                        feature.borderColor
                      )}
                    >
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-bold mb-1">Dica Rápida</h4>
                <p className="text-sm text-muted-foreground">
                  Para começar a usar as funcionalidades do WhatsApp, certifique-se de ter pelo menos uma sessão conectada em <span className="text-primary font-semibold">Conectores</span>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
